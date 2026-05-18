import re

with open('screeps-client/src/components/ConsolePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("<div ref={logScrollRef}", "<div ref={(el) => logScrollRef = el}")
content = content.replace("<div ref={consoleScrollRef}", "<div ref={(el) => consoleScrollRef = el}")
content = content.replace("ref={splitContainerRef}", "ref={(el) => splitContainerRef = el}")

with open('screeps-client/src/components/ConsolePanel.tsx', 'w') as f:
    f.write(content)

with open('screeps-client/src/components/MapViewer.tsx', 'r') as f:
    content = f.read()

content = content.replace("let _canvasRef: HTMLCanvasElement | undefined", "let canvasRef: HTMLCanvasElement | undefined")
content = content.replace("if (!_canvasRef) return", "if (!canvasRef) return")
content = content.replace("await renderer.init(_canvasRef!)", "await renderer.init(canvasRef!)")
content = content.replace("<canvas ref={_canvasRef}", "<canvas ref={(el) => canvasRef = el}")

with open('screeps-client/src/components/MapViewer.tsx', 'w') as f:
    f.write(content)


with open('screeps-client/src/components/RoomViewer.tsx', 'r') as f:
    content = f.read()

content = content.replace("<div ref={containerRef}", "<div ref={(el) => containerRef = el}")

with open('screeps-client/src/components/RoomViewer.tsx', 'w') as f:
    f.write(content)

with open('screeps-client/src/components/SelectionList.tsx', 'r') as f:
    content = f.read()

content = content.replace("let finalKey = k", "const finalKey = k")
content = content.replace("(v: any)", "(v: string | number)")

with open('screeps-client/src/components/SelectionList.tsx', 'w') as f:
    f.write(content)
