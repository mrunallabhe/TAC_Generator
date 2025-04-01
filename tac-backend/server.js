const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let tempCount = 1;
let address = 100;

app.post("/generate-tac", (req, res) => {
    const code = req.body.code;
    if (!code) {
        return res.json({ tac: "Error: No code provided." });
    }

    const tac = generateTAC(code);
    res.json({ tac });
});

function generateTAC(code) {
    tempCount = 1;
    address = 100;

    const lines = code.split("\n").map(line => line.trim()).filter(line => line);
    let tacLines = [];
    let stack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith("for")) {
            const iterator = line.match(/\((.*?)\)/)?.[1];
            const [init, condition, increment] = iterator.split(";").map(s => s.trim());
            
            // Handle initialization
            if (init) {
                tacLines.push(`${address++}: ${init}`);
            }
            
            const loopStart = address;
            const temp = `t${tempCount++}`;
            tacLines.push(`${address++}: ${temp} = ${condition}`);
            const exitJump = address++;
            tacLines.push(`${exitJump}: ifFalse ${temp} goto ?`);
            
            stack.push({
                type: 'for',
                exitJump,
                loopStart,
                increment,
                temp
            });
        } 
        
        else if (line.startsWith("if")) {
            const condition = line.match(/\((.*?)\)/)?.[1];
            const temp = `t${tempCount++}`;
            tacLines.push(`${address++}: ${temp} = ${condition}`);
            const elseJump = address++;
            tacLines.push(`${elseJump}: ifFalse ${temp} goto ?`);
    
            stack.push({
                type: 'if',
                elseJump,
                temp
            });
        } 
        
        else if (line.startsWith("else")) {
            const prev = stack.pop();
            if (prev && prev.type === 'if') {
                const endIfJump = address++;
                tacLines.push(`${endIfJump}: goto ?`);
                tacLines[prev.elseJump] = `${prev.elseJump}: ifFalse ${prev.temp} goto ${address}`;
                stack.push({
                    type: 'else',
                    endIfJump
                });
            }
        } 
        
        else if (line === "}") {
            const prev = stack.pop();
            if (!prev) continue;

            if (prev.type === 'for') {
                // Handle loop end
                if (prev.increment) {
                    tacLines.push(`${address++}: ${prev.increment}`);
                }
                tacLines.push(`${address++}: goto ${prev.loopStart}`);
                tacLines[prev.exitJump] = `${prev.exitJump}: ifFalse ${prev.temp} goto ${address}`;
            }
            else if (prev.type === 'else') {
                // Handle else end
                tacLines[prev.endIfJump] = `${prev.endIfJump}: goto ${address}`;
            }
        } 
        
        else if (line.includes("=")) {
            const [varName, expr] = line.split("=").map(x => x.trim());
            if (expr) {
                const temp = `t${tempCount++}`;
                tacLines.push(`${address++}: ${temp} = ${expr}`);
                tacLines.push(`${address++}: ${varName} = ${temp}`);
            }
        }
    }

    return tacLines.join("\n");
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
