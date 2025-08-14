import React from 'react';
import { ParsedData } from '@/types';
import { getTablesByDashboard } from '@/utils/graphBuilder';
import { BarChart3, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  parsedData: ParsedData;
  selectedDashboard: string | null;
  onDashboardSelect: (dashboardId: string | null) => void;
  onTableHighlight: (tableIds: Set<string>) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  parsedData,
  selectedDashboard,
  onDashboardSelect,
  onTableHighlight
}) => {
  const dashboards = Array.from(parsedData.dashboards.values());

  const handleDashboardClick = (dashboardId: string) => {
    if (selectedDashboard === dashboardId) {
      onDashboardSelect(null);
      onTableHighlight(new Set());
    } else {
      onDashboardSelect(dashboardId);
      const tableIds = getTablesByDashboard(dashboardId, parsedData);
      onTableHighlight(tableIds);
    }
  };

  const getTableCount = (dashboardId: string) => {
    return parsedData.dashboardTables.filter(dt => dt.dashboardId === dashboardId).length;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Dashboards
        </CardTitle>
        <CardDescription>
          Click a dashboard to show only its connected tables
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-2 px-2">
            {dashboards.map(dashboard => {
              const tableCount = getTableCount(dashboard.id);
              const isSelected = selectedDashboard === dashboard.id;
              
              return (
                <Card
                  key={dashboard.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => handleDashboardClick(dashboard.id)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {dashboard.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {dashboard.id}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {tableCount} tables
                          </Badge>
                        </div>
                        {dashboard.businessArea && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.businessArea}
                          </p>
                        )}
                        {dashboard.owner && (
                          <p className="text-xs text-muted-foreground">
                            Owner: {dashboard.owner}
                          </p>
                        )}
                      </div>
                      {dashboard.link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(dashboard.link, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {isSelected && tableCount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium mb-2">
                          Connected tables:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {parsedData.dashboardTables
                            .filter(dt => dt.dashboardId === dashboard.id)
                            .slice(0, 5)
                            .map(dt => (
                              <Badge
                                key={dt.tableId}
                                variant="outline"
                                className="text-xs"
                              >
                                {dt.tableName || dt.tableId}
                              </Badge>
                            ))}
                          {tableCount > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tableCount - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {selectedDashboard && (
          <Button
            onClick={() => {
              onDashboardSelect(null);
              onTableHighlight(new Set());
            }}
            variant="outline"
            className="w-full mt-3"
          >
            Clear selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardView;