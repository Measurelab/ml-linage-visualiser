import React from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Legend: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Layers</p>
          <div className="flex gap-2">
            <Badge variant="success" className="text-xs py-0">
              Raw
            </Badge>
            <Badge variant="info" className="text-xs py-0">
              Inter
            </Badge>
            <Badge variant="warning" className="text-xs py-0">
              Target
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Table types</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-xs">Table</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">View</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Query</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012-2v-5a2 2 0 012-2 1 1 0 000-2h-1a4 4 0 00-3 1.354A4 4 0 005 4H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2v4H4V5z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Sheet</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Special indicators</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 -top-0.5 -left-0.5 border border-primary rounded-full border-dashed"></div>
              </div>
              <span className="text-xs">Scheduled query</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 border-2 border-foreground rounded-full"></div>
              <span className="text-xs">Selected table</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Legend;