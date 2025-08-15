export default function handler(req, res) {
  // Simple health check endpoint for the proxy to verify the tool is running
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lineage-visualizer'
  });
}