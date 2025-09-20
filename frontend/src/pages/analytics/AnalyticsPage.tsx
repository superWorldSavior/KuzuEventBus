import { useState } from "react";
import { 
  ChartBar, 
  Clock, 
  Database as DatabaseIcon,
  TrendUp,
  TrendDown,
  Calendar,
  Funnel
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d");

  // Mock analytics data
  const analyticsData = {
    totalQueries: 1247,
    avgExecutionTime: 89,
    errorRate: 2.3,
    topDatabases: [
      { name: "social-network", queries: 456, avgTime: 78 },
      { name: "ecommerce", queries: 342, avgTime: 102 },
      { name: "knowledge-graph", queries: 189, avgTime: 45 }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Performance insights and query analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm">
            <Funnel className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <ChartBar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <TrendUp className="w-3 h-3" />
              <span>+12%</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analyticsData.totalQueries.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Queries</div>
            <div className="text-xs text-gray-500 mt-2">vs last period</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <TrendDown className="w-3 h-3" />
              <span>-5%</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analyticsData.avgExecutionTime}ms
            </div>
            <div className="text-sm text-gray-600">Avg Execution Time</div>
            <div className="text-xs text-gray-500 mt-2">vs last period</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-lg">
              <TrendDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <TrendUp className="w-3 h-3" />
              <span>+0.8%</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analyticsData.errorRate}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
            <div className="text-xs text-gray-500 mt-2">vs last period</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg">
              <DatabaseIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <span>0%</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analyticsData.topDatabases.length}
            </div>
            <div className="text-sm text-gray-600">Active Databases</div>
            <div className="text-xs text-gray-500 mt-2">vs last period</div>
          </div>
        </div>
      </div>

      {/* Charts Section - Simplified for now */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Volume Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Query Volume</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Last 7 days</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <ChartBar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Query volume chart will be displayed here</p>
            </div>
          </div>
        </div>

        {/* Performance Trends Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
            <Badge className="bg-blue-100 text-blue-700">Execution Time</Badge>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Performance trends chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Usage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Database Usage</h3>
          <Badge className="bg-gray-100 text-gray-700">Top Databases</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Usage Chart Placeholder */}
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <DatabaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Database usage chart will be displayed here</p>
            </div>
          </div>

          {/* Database Stats Table */}
          <div className="space-y-3">
            {analyticsData.topDatabases.map((db, index) => (
              <div key={db.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{db.name}</div>
                    <div className="text-xs text-gray-500">{db.queries} queries</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{db.avgTime}ms</div>
                  <div className="text-xs text-gray-500">avg time</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Performance Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Query Performance Breakdown</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">76%</div>
            <div className="text-sm text-gray-600">Fast queries</div>
            <div className="text-xs text-gray-500">{'<100ms'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">18%</div>
            <div className="text-sm text-gray-600">Medium queries</div>
            <div className="text-xs text-gray-500">100-500ms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">5%</div>
            <div className="text-sm text-gray-600">Slow queries</div>
            <div className="text-xs text-gray-500">500ms-1s</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">1%</div>
            <div className="text-sm text-gray-600">Very slow queries</div>
            <div className="text-xs text-gray-500">{'>1s'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}