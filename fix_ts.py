import re

with open('screeps-client/src/components/ConsolePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("const logScrollRef: HTMLDivElement | undefined = undefined", "let logScrollRef: HTMLDivElement | undefined = undefined")
content = content.replace("const consoleScrollRef: HTMLDivElement | undefined = undefined", "let consoleScrollRef: HTMLDivElement | undefined = undefined")

with open('screeps-client/src/components/ConsolePanel.tsx', 'w') as f:
    f.write(content)
