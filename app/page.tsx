"use client";

import Link from "next/link";
import Image from "next/image";
import TessellationBackground from "@/components/TessellationBackground";
import {
  Sparkles,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  FileText,
  BarChart,
  DollarSign,
  Brain
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Fixed Tessellation Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <TessellationBackground className="opacity-30" />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Kimia Logo with glow effect */}
          <div className="mx-auto mb-8 h-48 w-48 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-3xl opacity-50 animate-pulse" />
            <Image
              src="/kimia.png"
              alt="Kimia"
              fill
              className="object-contain relative z-10 drop-shadow-2xl"
              priority
            />
          </div>

          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full px-6 py-2 mb-6 shadow-2xl">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-white">Innovation Management Platform</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Transform
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Innovation Management
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Streamline the complete lifecycle of research projects—from proposal to impact assessment with AI-powered intelligence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-bold text-lg shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-lg text-white border-2 border-white/30 rounded-xl hover:bg-white/20 transition-all font-bold text-lg shadow-2xl hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-blue-200">
            Powerful tools to manage every stage of innovation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Smart Proposals"
            description="AI-powered proposal creation with guided workflows and collaborative tools"
            gradient="from-blue-500 to-cyan-500"
          />
          <FeatureCard
            icon={<CheckCircle className="w-8 h-8" />}
            title="Fair Evaluation"
            description="Transparent review processes with customizable rubrics and blind review options"
            gradient="from-purple-500 to-pink-500"
          />
          <FeatureCard
            icon={<Target className="w-8 h-8" />}
            title="Real-Time Tracking"
            description="Monitor milestones and progress with visual dashboards and automated alerts"
            gradient="from-indigo-500 to-purple-500"
          />
          <FeatureCard
            icon={<DollarSign className="w-8 h-8" />}
            title="Financial Control"
            description="Integrated budget management with OCR receipt processing and compliance checks"
            gradient="from-green-500 to-emerald-500"
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="AI Intelligence"
            description="Leverage AI for writing assistance, evaluation insights, and predictive analytics"
            gradient="from-yellow-500 to-orange-500"
          />
          <FeatureCard
            icon={<BarChart className="w-8 h-8" />}
            title="Data Insights"
            description="Comprehensive analytics and institutional intelligence from historical data"
            gradient="from-pink-500 to-rose-500"
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <StatCard icon={<Zap />} value="100%" label="Digital Workflow" />
            <StatCard icon={<Users />} value="Real-Time" label="Collaboration" />
            <StatCard icon={<Rocket />} value="AI-Powered" label="Intelligence" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl">
          <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Ready to Transform Innovation?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join leading institutions revolutionizing research and innovation management.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-bold text-xl shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
          >
            Get Started Now
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <Link
          href="/guide"
          className="text-blue-300 hover:text-blue-200 transition-colors underline decoration-blue-400"
        >
          User Guide & Documentation
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105 hover:border-white/20 shadow-xl hover:shadow-2xl">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-blue-200 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="group">
      <div className="w-16 h-16 mx-auto mb-4 text-blue-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="text-5xl font-black text-white mb-2 group-hover:scale-110 transition-transform">
        {value}
      </div>
      <div className="text-blue-200 font-medium">{label}</div>
    </div>
  );
}
