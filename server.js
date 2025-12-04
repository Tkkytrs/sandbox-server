const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const sandboxDir = './sandbox';
if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir);

app.post('/code', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).send('No code provided');
    
    const timestamp = Date.now();
    const execDir = path.join(sandboxDir, `exec_${timestamp}`);
    fs.mkdirSync(execDir);
    
    const codeFile = path.join(execDir, 'code.js');
    fs.writeFileSync(codeFile, code);
    
    exec(`timeout 30s node ${codeFile}`, { cwd: execDir }, (error, stdout, stderr) => {
        let response = { output: stdout || '', error: stderr || '' };
        
        const files = fs.readdirSync(execDir).filter(f => f !== 'code.js');
        if (files.length > 0) {
            response.files = files.map(f => ({
                name: f,
                url: `/download/${timestamp}/${f}`,
                expires: new Date(Date.now() + 180000).toISOString()
            }));
        }
        
        res.json(response);
        
        setTimeout(() => {
            fs.rmSync(execDir, { recursive: true, force: true });
        }, 180000);
    });
});

app.get('/download/:timestamp/:filename', (req, res) => {
    const filePath = path.join(sandboxDir, `exec_${req.params.timestamp}`, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found or expired');
    }
});

app.listen(3000, () => console.log('Sandbox server running on port 3000'));
