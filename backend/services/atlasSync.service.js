import mongoose from "mongoose";

// Collections to sync (MongoDB collection names)
const DEFAULT_COLLECTIONS = [
  "medicines",
  "suppliers",
  "branches",
  "inventories",
  "requests",
  "sales",
  "users",
  "stores",
  "pharmacies",
  "chats",
];

let atlasConn = null;

export function getAtlasConnection() {
  return atlasConn;
}

export async function connectAtlas(uri) {
  if (!uri) throw new Error("MONGO_ATLAS_URL not provided");
  if (atlasConn && atlasConn.readyState === 1) return atlasConn;
  if (atlasConn && atlasConn.readyState === 2) return atlasConn; // connecting
  atlasConn = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  // Probe connectivity
  await atlasConn.asPromise();
  return atlasConn;
}

// Simple per-collection sync state stored in local DB
// { _id: <collection>, lastSyncedAt: Date }
async function getSyncState(localDb, collection) {
  const stateCol = localDb.collection("sync_state");
  const doc = await stateCol.findOne({ _id: collection });
  return doc || { _id: collection, lastSyncedAt: null };
}

async function setSyncState(localDb, collection, ts) {
  const stateCol = localDb.collection("sync_state");
  await stateCol.updateOne(
    { _id: collection },
    { $set: { lastSyncedAt: ts || null } },
    { upsert: true }
  );
}

// Convert Mongoose doc to plain object for upsert, removing internal fields
function normalizeDoc(doc) {
  const obj = { ...doc };
  delete obj.__v;
  return obj;
}

// Build an upsert filter that tries to match existing docs by known unique keys
function buildUpsertFilter(collName, doc) {
  const byId = { _id: doc._id };
  // Suppliers: unique by supplierName (legacy design)
  if (collName === "suppliers" && doc.supplierName) {
    return { $or: [byId, { supplierName: doc.supplierName }] };
  }
  // Users: prefer email uniqueness
  if (collName === "users" && doc.email) {
    return { $or: [byId, { email: doc.email }] };
  }
  // Pharmacies: unique by code
  if (collName === "pharmacies" && doc.code) {
    return { $or: [byId, { code: doc.code }] };
  }
  // Default: _id only
  return byId;
}

export async function runAtlasSync({
  collections = DEFAULT_COLLECTIONS,
  batchSize = 500,
  deleteWhenFlagged = false, // if true: delete in Atlas when isDeleted true
  logger = console,
} = {}) {
  if (!atlasConn || atlasConn.readyState !== 1) {
    throw new Error("Atlas connection not initialized");
  }
  const localDb = mongoose.connection.db;
  const atlasDb = atlasConn.db;
  const results = {};

  for (const collName of collections) {
    const localColl = localDb.collection(collName);
    const atlasColl = atlasDb.collection(collName);
    const state = await getSyncState(localDb, collName);
    let last = state.lastSyncedAt ? new Date(state.lastSyncedAt) : null;
    let totalUpserts = 0;
    let totalDeletes = 0;
    let loop = 0;
    // Process in batches ordered by updatedAt
    while (true) {
      loop += 1;
      const query = last ? { updatedAt: { $gt: last } } : {};
      // Fallback if no updatedAt exists: sync everything once
      const cursor = localColl
        .find(query)
        .sort({ updatedAt: 1 })
        .limit(batchSize);
      const batch = await cursor.toArray();
      if (!batch.length) break;
      const ops = [];
      for (const d of batch) {
        const doc = normalizeDoc(d);
        if (deleteWhenFlagged && doc.isDeleted === true) {
          ops.push({ deleteOne: { filter: buildUpsertFilter(collName, doc) } });
          totalDeletes += 1;
        } else {
          const { _id, ...rest } = doc;
          ops.push({
            updateOne: {
              filter: buildUpsertFilter(collName, doc),
              update: { $set: rest },
              upsert: true,
            },
          });
          totalUpserts += 1;
        }
      }
      if (ops.length) {
        try {
          await atlasColl.bulkWrite(ops, { ordered: false });
        } catch (e) {
          // Handle duplicate key errors by falling back to per-doc upserts
          if (e && e.code === 11000) {
            logger.warn(
              `[AtlasSync] bulkWrite duplicate key; falling back to per-doc upserts for ${collName}`
            );
            for (const op of ops) {
              try {
                if (op.updateOne) {
                  await atlasColl.updateOne(
                    op.updateOne.filter,
                    op.updateOne.update,
                    { upsert: true }
                  );
                } else if (op.deleteOne) {
                  await atlasColl.deleteOne(op.deleteOne.filter);
                }
              } catch (ee) {
                // Log and continue to avoid blocking others
                logger.warn(
                  `[AtlasSync] per-doc op failed in ${collName}: ${ee.message}`
                );
              }
            }
          } else {
            throw e;
          }
        }
      }
      // Advance cursor
      const lastDoc = batch[batch.length - 1];
      const lastTs = lastDoc.updatedAt || lastDoc.createdAt || new Date();
      await setSyncState(localDb, collName, lastTs);
      last = new Date(lastTs);
      logger.log(
        `[AtlasSync] ${collName} loop#${loop} upserts=${totalUpserts} deletes=${totalDeletes} lastTs=${last.toISOString()}`
      );
      if (batch.length < batchSize) break;
    }
    results[collName] = { upserts: totalUpserts, deletes: totalDeletes };
  }
  return { ok: true, results };
}
