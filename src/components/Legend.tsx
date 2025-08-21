import React from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Legend: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="h-3 w-3" />
          Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {/* Node Types */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Node types</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-xs">Tables</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-purple-500 rounded-sm"></div>
              <span className="text-xs">Dashboards</span>
            </div>
          </div>
        </div>

        {/* Layers and Indicators in one row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Table layers</p>
            <div className="space-y-1">
              <Badge variant="success" className="text-xs py-0 px-1 block w-fit">Raw</Badge>
              <Badge variant="info" className="text-xs py-0 px-1 block w-fit">Inter</Badge>
              <Badge variant="warning" className="text-xs py-0 px-1 block w-fit">Target</Badge>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Indicators</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="relative">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 -top-0.5 -left-0.5 border border-primary rounded-full border-dashed"></div>
                </div>
                <span className="text-xs">Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 border-2 border-foreground rounded-full"></div>
                <span className="text-xs">Selected</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Note about interactions */}
        <div>
          <p className="text-xs text-muted-foreground">
            <strong>Click tables</strong> to view details • <strong>Click dashboards</strong> to see connected sources • <strong>Right-click</strong> to add/delete nodes
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Legend;