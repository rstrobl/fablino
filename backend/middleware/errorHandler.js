// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Return appropriate error response
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  
  // Default to 500 server error
  res.status(500).json({ error: 'Internal server error' });
}

export { errorHandler };