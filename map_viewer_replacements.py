import re

with open('screeps-client/src/components/MapViewer.tsx', 'r') as f:
    content = f.read()

content = content.replace("let canvasRef: HTMLCanvasElement | undefined", "let _canvasRef: HTMLCanvasElement | undefined")
content = content.replace("const [selectedRoom, setSelectedRoom] = createSignal<string | null>(props.originRoom ?? null)", "const origin = () => props.originRoom\n  const [selectedRoom, setSelectedRoom] = createSignal<string | null>(origin() ?? null)")
content = content.replace("props.shard\n    roomStats.clear()", "void props.shard\n    roomStats.clear()")
content = content.replace("if (!canvasRef) return", "if (!_canvasRef) return")
content = content.replace("await renderer.init(canvasRef!)", "await renderer.init(_canvasRef!)")
content = content.replace("onClick={() => renderer?.zoomIn()}", "onClick={() => { if (renderer) renderer.zoomIn() }}")
content = content.replace("onClick={() => renderer?.zoomOut()}", "onClick={() => { if (renderer) renderer.zoomOut() }}")
content = content.replace("<canvas ref={canvasRef} style={{ display: 'block' }} />", "<canvas ref={_canvasRef} style={{ display: 'block' }} />")

with open('screeps-client/src/components/MapViewer.tsx', 'w') as f:
    f.write(content)
