# Lens: keyed sections

This page defines the lens contract.
A document is an ordered list of sections.
Each section has a nonempty opaque id and an ordered body of lines.
Ids are distinct within each document.
A line is a sequence of characters.
The lens accepts explicit line arrays and does not split their elements.
An empty line array is a valid empty document.

## Render and parse

Render each section as a header, its body lines, and a closing line.
The header is `::: ` followed by the id.
The closing line is exactly `:::`.
Render a body line with one extra leading backslash when it starts with `:::` or a backslash.
Render every other body line unchanged.

Outside a section, the parser accepts only a header.
A header starts with exactly `::: `; all characters after that prefix form the id.
Inside a section, the exact line `:::` closes the section.
The parser refuses any other unescaped body line that starts with `:::`.
For a body line with a leading backslash, inspect the rest of the line.
Remove exactly one backslash if the rest starts with `:::` or a backslash.
Otherwise keep the line unchanged, including its leading backslash.
For example, `\plain` remains `\plain`; its normal render is `\\plain`.
Indented fences are ordinary body lines.

The parser refuses the whole text for any of these conditions:

- A line outside a section is not a header.
- A header has an empty id.
- Two sections have the same id.
- A section has no closing line.
- An unescaped body line starts with `:::` but is not the closing line.

Normalization parses the whole text and renders the resulting document.
It refuses text when parsing fails.

## Edit and apply

Match edited sections to base sections by id, not by position.
A moved section with the same body produces no outcome.
A changed body for a known id produces an accepted outcome with that id and body.
An edited section with an unknown id produces an unknown outcome.
A missing base section produces an absent outcome.
List accepted and unknown outcomes in edited order, then absent outcomes in base order.
Apply accepted bodies to matching base sections in base order.
Keep the old body for an absent section.
Do not add unknown sections.

## Scenario adapter

The lens itself does not split strings into lines.
The separate scenario adapter splits a head's string value at every LF.
It keeps all parts, including empty parts, and leaves CR unchanged.
Thus an empty string gives one empty line, and a trailing LF gives a final empty line.
`input.lens.base` holds base sections; `input.lens.text` holds edited lines.
`expect.lens` holds the rendered base, edit outcomes, and applied sections.
The direct lens runner does not itself prove the adapter's head-to-section relation.
