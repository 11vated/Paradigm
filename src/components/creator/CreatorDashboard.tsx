/**
 * Creator Dashboard - Phase 7
 * 
 * Dashboard for seed management, artifact visualization, and economy analytics.
 * Provides creators with comprehensive tools for managing their creative workflow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  Download,
  Eye,
  Star,
  Clock,
  ArrowUpRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { creatorWorkflow, type CreatorWorkflowState } from '@/lib/creator/creator-workflow';
import { artifactValidator } from '@/lib/creator/artifact-validation';

interface DashboardStats {
  totalArtifacts: number;
  publishedArtifacts: number;
  draftArtifacts: number;
  totalViews: number;
  totalDownloads: number;
  totalSales: number;
  totalRevenue: number;
  reputation: number;
}

interface CreatorDashboardProps {
  creatorId: string;
}

const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ creatorId }) => {
  const [workflowState, setWorkflowState] = useState<CreatorWorkflowState | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'artifacts' | 'analytics' | 'economy'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [creatorId]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Get workflow state
      const state = creatorWorkflow.getWorkflowState(creatorId);
      setWorkflowState(state);

      // Calculate stats
      const dashboardStats: DashboardStats = {
        totalArtifacts: state.artifacts.length,
        publishedArtifacts: state.publishedArtifacts.length,
        draftArtifacts: state.draftArtifacts.length,
        totalViews: state.analytics.views,
        totalDownloads: state.analytics.downloads,
        totalSales: state.analytics.sales,
        totalRevenue: state.analytics.revenue,
        reputation: state.profile.reputation,
      };
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!workflowState || !stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No creator data found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Creator Dashboard</h2>
          </div>
          <div className="text-sm text-slate-400">
            {workflowState.profile.name}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'artifacts', label: 'Artifacts', icon: Package },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'economy', label: 'Economy', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedTab === tab.id
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {selectedTab === 'overview' && <OverviewTab stats={stats} />}
        {selectedTab === 'artifacts' && <ArtifactsTab workflowState={workflowState} />}
        {selectedTab === 'analytics' && <AnalyticsTab stats={stats} />}
        {selectedTab === 'economy' && <EconomyTab stats={stats} />}
      </div>
    </div>
  );
};

// ─── Tab Components ─────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Package}
        label="Total Artifacts"
        value={stats.totalArtifacts}
        color="cyan"
      />
      <StatCard
        icon={Eye}
        label="Total Views"
        value={stats.totalViews}
        color="purple"
      />
      <StatCard
        icon={Download}
        label="Downloads"
        value={stats.totalDownloads}
        color="green"
      />
      <StatCard
        icon={DollarSign}
        label="Revenue"
        value={`${stats.totalRevenue.toFixed(2)} ETH`}
        color="yellow"
      />
    </div>

    {/* Quick Actions */}
    <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center gap-2 px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors">
          <Package className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-400">Create New Artifact</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-400">View Analytics</span>
        </button>
      </div>
    </div>

    {/* Recent Activity */}
    <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
      <div className="space-y-2">
        <ActivityItem
          icon={Package}
          text="Created new artifact: Cosmic Warrior"
          time="2 hours ago"
        />
        <ActivityItem
          icon={Download}
          text="Artifact downloaded: Neon City"
          time="5 hours ago"
        />
        <ActivityItem
          icon={Star}
          text="Received 5-star rating on: Forest Spirit"
          time="1 day ago"
        />
      </div>
    </div>
  </div>
);

const ArtifactsTab: React.FC<{ workflowState: CreatorWorkflowState }> = ({ workflowState }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-white">Your Artifacts</h3>
      <div className="flex gap-2">
        <span className="text-xs text-slate-400">
          Published: {workflowState.publishedArtifacts.length}
        </span>
        <span className="text-xs text-slate-400">
          Drafts: {workflowState.draftArtifacts.length}
        </span>
      </div>
    </div>

    <div className="space-y-2">
      {workflowState.artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.seedHash}
          artifact={artifact}
          isPublished={workflowState.publishedArtifacts.includes(artifact.seedHash)}
        />
      ))}
    </div>
  </div>
);

const AnalyticsTab: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400">Total Views</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.totalViews}</div>
        <div className="text-xs text-green-400 mt-1">+12% from last week</div>
      </div>

      <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-green-400" />
          <span className="text-xs text-slate-400">Downloads</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.totalDownloads}</div>
        <div className="text-xs text-green-400 mt-1">+8% from last week</div>
      </div>
    </div>

    <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Performance Metrics</h3>
      <div className="space-y-3">
        <MetricBar label="Artifact Quality" value={85} color="cyan" />
        <MetricBar label="User Engagement" value={72} color="purple" />
        <MetricBar label="Market Reach" value={65} color="green" />
        <MetricBar label="Creator Reputation" value={stats.reputation} color="yellow" />
      </div>
    </div>
  </div>
);

const EconomyTab: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-slate-400">Total Revenue</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.totalRevenue.toFixed(2)} ETH</div>
        <div className="text-xs text-green-400 mt-1">+25% from last month</div>
      </div>

      <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-xs text-slate-400">Total Sales</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.totalSales}</div>
        <div className="text-xs text-green-400 mt-1">+15% from last month</div>
      </div>
    </div>

    <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Revenue Breakdown</h3>
      <div className="space-y-3">
        <RevenueItem label="Direct Sales" value="65%" amount={`${(stats.totalRevenue * 0.65).toFixed(2)} ETH`} />
        <RevenueItem label="Marketplace" value="25%" amount={`${(stats.totalRevenue * 0.25).toFixed(2)} ETH`} />
        <RevenueItem label="Licensing" value="10%" amount={`${(stats.totalRevenue * 0.10).toFixed(2)} ETH`} />
      </div>
    </div>
  </div>
);

// ─── Sub-Components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: any;
  label: string;
  value: number | string;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-5 h-5 text-${color}-400`} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </motion.div>
);

const ActivityItem: React.FC<{ icon: any; text: string; time: string }> = ({ icon: Icon, text, time }) => (
  <div className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg">
    <Icon className="w-4 h-4 text-cyan-400" />
    <div className="flex-1">
      <div className="text-sm text-slate-300">{text}</div>
      <div className="text-xs text-slate-500">{time}</div>
    </div>
  </div>
);

const ArtifactCard: React.FC<{ artifact: any; isPublished: boolean }> = ({ artifact, isPublished }) => (
  <div className="p-4 bg-slate-800/30 border border-cyan-900/20 rounded-lg hover:border-cyan-500/30 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <div>
        <div className="text-sm font-semibold text-white">{artifact.seedName}</div>
        <div className="text-xs text-slate-400">{artifact.domain}</div>
      </div>
      <div className={`px-2 py-1 rounded text-xs ${
        isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
      }`}>
        {isPublished ? 'Published' : 'Draft'}
      </div>
    </div>
    <div className="flex items-center gap-4 text-xs text-slate-500">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>Gen {artifact.generation}</span>
      </div>
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3" />
        <span>{artifact.sensoryProfile.visual.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-white">{value}%</span>
    </div>
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        className={`h-full bg-${color}-500`}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

const RevenueItem: React.FC<{ label: string; value: string; amount: string }> = ({ label, value, amount }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-cyan-400" />
      <span className="text-sm text-slate-300">{label}</span>
    </div>
    <div className="text-right">
      <div className="text-sm text-white">{amount}</div>
      <div className="text-xs text-slate-500">{value}</div>
    </div>
  </div>
);

export default CreatorDashboard;
