const express = require('express');
const router = express.Router();
const codeExecutor = require('../services/codeExecutor');

router.post('/run', async (req, res) => {
  const { code, language, stdin } = req.body;
  
  try {
    const result = await codeExecutor.execute(code, language, stdin);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: error.details 
    });
  }
});

router.post('/test', async (req, res) => {
  const { code, language, testCases } = req.body;
  
  try {
    const results = await codeExecutor.runTests(code, language, testCases);
    res.json({ success: true, results });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;