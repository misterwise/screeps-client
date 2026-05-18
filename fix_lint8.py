import re

with open('screeps-client/src/components/ConsolePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("let logScrollRef: HTMLDivElement | undefined\n  // eslint-disable-next-line no-unassigned-vars, @typescript-eslint/no-unused-vars", "let logScrollRef: HTMLDivElement | undefined = undefined")
content = content.replace("let consoleScrollRef: HTMLDivElement | undefined\n  // eslint-disable-next-line no-unassigned-vars, @typescript-eslint/no-unused-vars", "let consoleScrollRef: HTMLDivElement | undefined = undefined")
content = content.replace("let splitContainerRef: HTMLDivElement | undefined\n  // eslint-disable-next-line no-unassigned-vars, @typescript-eslint/no-unused-vars", "let splitContainerRef: HTMLDivElement | undefined = undefined")

with open('screeps-client/src/components/ConsolePanel.tsx', 'w') as f:
    f.write(content)

with open('screeps-client/src/components/SelectionList.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const v = details\[k\] as any', r'const v = details[k]', content)

with open('screeps-client/src/components/SelectionList.tsx', 'w') as f:
    f.write(content)
