import re

with open('screeps-client/src/components/ConsolePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("let logScrollRef: HTMLDivElement | undefined = undefined", "let logScrollRef: HTMLDivElement | any")
content = content.replace("let consoleScrollRef: HTMLDivElement | undefined = undefined", "let consoleScrollRef: HTMLDivElement | any")

with open('screeps-client/src/components/ConsolePanel.tsx', 'w') as f:
    f.write(content)
