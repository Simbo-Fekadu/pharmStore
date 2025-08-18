"use client";

import { useNavigate } from "react-router-dom";
import {
  Pill,
  Shield,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 sm:px-6 lg:px-8"
        style={{ background: "var(--bg-start)" }}
      >
        {/* Background Pattern - Responsive positioning */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-4 sm:top-20 sm:left-20 w-16 h-16 sm:w-32 sm:h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-20 right-4 sm:bottom-32 sm:right-16 w-12 h-12 sm:w-24 sm:h-24 rounded-full bg-white/15"></div>
          <div className="absolute top-1/2 right-1/4 sm:right-1/3 w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-white/10"></div>
        </div>

        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left w-full order-2 lg:order-1">
              <div className="mb-6 sm:mb-8 w-full">
                {/* Logo and Title */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 w-full justify-center lg:justify-start">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-full backdrop-blur-sm">
                    <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white tracking-tight">
                    PharmStore
                  </h1>
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Revolutionary pharmacy inventory management system designed
                  for modern healthcare professionals
                </p>

                {/* CTA Button */}
                <div className="flex justify-center lg:justify-start">
                  <button
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-transparent text-white rounded-lg font-semibold text-base sm:text-lg border border-white/30 hover:border-white hover:bg-white/10 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#183D3D] transition duration-200 transform hover:scale-105"
                    onClick={() => navigate("/signin")}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="flex-1 w-full max-w-md sm:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 order-1 lg:order-2">
              <div className="relative">
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:shadow-3xl">
                  <img
                    src="src/images/pharm.jpg"
                    alt="Modern Pharmacy Management"
                    className="w-full h-56 sm:h-72 md:h-80 lg:h-96 xl:h-[28rem] object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-white text-[#183D3D] p-3 sm:p-4 rounded-xl shadow-2xl border border-gray-100 transition-all duration-300 hover:scale-110">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      <span className="font-semibold text-xs sm:text-sm">
                        99.9% Uptime
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#183D3D] mb-4">
              Why Choose PharmStore?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Streamline your pharmacy operations with our comprehensive
              inventory management solution
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "Real-time Analytics",
                description:
                  "Track inventory levels, sales trends, and expiration dates with powerful analytics dashboard",
              },
              {
                icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "Secure & Compliant",
                description:
                  "HIPAA compliant with enterprise-grade security to protect sensitive pharmaceutical data",
              },
              {
                icon: <Clock className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "24/7 Monitoring",
                description:
                  "Automated alerts for low stock, expiring medications, and critical inventory updates",
              },
              {
                icon: <Users className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "Multi-user Access",
                description:
                  "Role-based access control for pharmacists, technicians, and administrative staff",
              },
              {
                icon: <Pill className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "Drug Database",
                description:
                  "Comprehensive medication database with NDC numbers, interactions, and dosage information",
              },
              {
                icon: <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: "Easy Integration",
                description:
                  "Seamlessly integrate with existing POS systems and insurance verification platforms",
              },
            ].map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-gradient-to-br from-[#93B1A6]/10 to-[#5C8374]/10 p-6 sm:p-8 rounded-xl border border-[#93B1A6]/20 hover:shadow-lg transition duration-300 group-hover:scale-105 h-full">
                  <div className="text-[#183D3D] mb-4 group-hover:text-[#5C8374] transition duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#183D3D] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div
        className="py-12 sm:py-16 lg:py-20 relative overflow-hidden px-4 sm:px-6 lg:px-8"
        style={{ background: "var(--bg-start)" }}
      >
        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Ready to Transform Your Pharmacy?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed px-4">
            Join thousands of pharmacies already using PharmStore to streamline
            their operations and improve patient care.
          </p>
          <div className="flex justify-center">
            <button
              className="px-6 py-3 sm:px-8 sm:py-4 bg-transparent text-white rounded-lg font-semibold text-base sm:text-lg border border-white/30 hover:border-white hover:bg-white/10 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#183D3D] transition duration-200 transform hover:scale-105"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Background Elements - Responsive positioning */}
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-white/10"></div>
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 w-16 h-16 sm:w-32 sm:h-32 rounded-full bg-white/5"></div>
      </div>
    </div>
  );
};

export default Landing;
