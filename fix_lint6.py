import re

with open('screeps-client/src/components/ConsolePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("let logScrollRef: HTMLDivElement | undefined", "let logScrollRef: HTMLDivElement | undefined\n  // eslint-disable-next-line no-unassigned-vars\n  // @ts-ignore")
content = content.replace("let consoleScrollRef: HTMLDivElement | undefined", "let consoleScrollRef: HTMLDivElement | undefined\n  // eslint-disable-next-line no-unassigned-vars\n  // @ts-ignore")

with open('screeps-client/src/components/ConsolePanel.tsx', 'w') as f:
    f.write(content)

with open('screeps-client/src/components/SelectionList.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\(v: any\)', r'(v: string | number)', content)
content = re.sub(r'let finalKey = k', r'const finalKey = k', content)
content = re.sub(r'const v = details\[k\] as any', r'const v = details[k]', content)

with open('screeps-client/src/components/SelectionList.tsx', 'w') as f:
    f.write(content)
