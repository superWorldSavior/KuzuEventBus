import { Pulse, User, Database, FileText, Clock } from "@phosphor-icons/react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/utils";

interface ActivityItem {
  id: string;
  type:
    | "database_created"
    | "database_deleted"
    | "query_executed"
    | "query_error"
    | "user_login"
    | "file_uploaded";
  title: string;
  description: string;
  timestamp: Date | string; // Can be either Date object or ISO string
  user?: string;
  metadata?: Record<string, any>;
}

interface ActivityTimelineProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

export function ActivityTimeline({
  activities,
  isLoading = false,
  maxItems = 10,
  className,
}: ActivityTimelineProps) {
  // Mock data for development
  const mockActivities: ActivityItem[] = [
    {
      id: "1",
      type: "query_executed",
      title: "Query executed successfully",
      description: "Retrieved 8 nodes from social-network database",
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
      user: "alice@example.com",
      metadata: { query_time: "45ms", result_count: 8 },
    },
    {
      id: "2",
      type: "database_created",
      title: "New database created",
      description: "Created 'inventory-system' database",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      user: "bob@example.com",
    },
    {
      id: "3",
      type: "file_uploaded",
      title: "File uploaded",
      description: "Uploaded 'products.csv' to ecommerce-db",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      user: "carol@example.com",
      metadata: { file_size: "2.4MB", records: 1250 },
    },
    {
      id: "4",
      type: "user_login",
      title: "User signed in",
      description: "New session started",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
      user: "dave@example.com",
    },
    {
      id: "5",
      type: "query_executed",
      title: "Query failed",
      description: "Syntax error in Cypher query",
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      user: "alice@example.com",
      metadata: { error: "Invalid syntax" },
    },
    {
      id: "6",
      type: "database_deleted",
      title: "Database deleted",
      description: "Removed 'test-db' database",
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
      user: "admin@example.com",
    },
  ];

  const activitiesData = (activities || mockActivities).slice(0, maxItems);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "database_created":
      case "database_deleted":
        return <Database className="w-4 h-4" />;
      case "query_executed":
      case "query_error":
        return <Pulse className="w-4 h-4" />;
      case "user_login":
        return <User className="w-4 h-4" />;
      case "file_uploaded":
        return <FileText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "database_created":
        return "text-green-600 bg-green-100";
      case "database_deleted":
        return "text-red-600 bg-red-100";
      case "query_executed":
        return "text-blue-600 bg-blue-100";
      case "query_error":
        return "text-red-600 bg-red-100";
      case "user_login":
        return "text-purple-600 bg-purple-100";
      case "file_uploaded":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 p-6",
          className
        )}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
          View all
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Activities */}
        <div className="space-y-6">
          {activitiesData.map((activity) => (
            <div
              key={activity.id}
              className="relative flex items-start space-x-3"
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10",
                  getActivityColor(activity.type)
                )}
              >
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                      <span>
                        {formatDistanceToNow(
                          typeof activity.timestamp === "string"
                            ? parseISO(activity.timestamp)
                            : activity.timestamp,
                          {
                            addSuffix: true,
                          }
                        )}
                      </span>
                      {activity.user && (
                        <>
                          <span>•</span>
                          <span>{activity.user}</span>
                        </>
                      )}
                    </div>
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        {Object.entries(activity.metadata).map(
                          ([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {value}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {(typeof activity.timestamp === "string"
                      ? parseISO(activity.timestamp)
                      : activity.timestamp
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {activitiesData.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Pulse className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      )}

      {/* Load More Button */}
      {activitiesData.length > 0 &&
        activities &&
        activities.length > maxItems && (
          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Load more activities
            </button>
          </div>
        )}
    </div>
  );
}

ActivityTimeline.displayName = "ActivityTimeline";
