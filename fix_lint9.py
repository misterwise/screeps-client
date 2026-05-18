import re

with open('screeps-client/src/components/SelectionList.tsx', 'r') as f:
    content = f.read()

content = content.replace("const CUSTOM_DETAILS: Record<string, (props: { item: SelectedObject }) => any> = {", "import { JSX } from 'solid-js'\nconst CUSTOM_DETAILS: Record<string, (props: { item: SelectedObject }) => JSX.Element> = {")

with open('screeps-client/src/components/SelectionList.tsx', 'w') as f:
    f.write(content)
