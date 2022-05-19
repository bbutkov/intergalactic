---
title: API
---

@## Text

It's a main component for text in our interfaces. By default, this is a `span` tag.

```jsx
import { Text } from '@semcore/typography';
<Text />;
```

@typescript ITextProps

@## List

A list tagged with ʻul`. It's possible to set a custom marker for all items.

```jsx
import { List } from '@semcore/typography';
<List />;
```

@typescript IListProps

@## List.Item

A list item tagged with `li`. It's possible to set a custom marker.

```jsx
import { List } from '@semcore/typography';
<List.Item />;
```

@typescript IListItemProps

@## Blockquote

Quotes from great people 🙊

```jsx
import { Blockquote } from '@semcore/typography';
<Blockquote />;
```

@typescript IBlockquoteProps

@## Hint

The hint is very similar to [Link](/components/link/) and has a similar structure from `Addon` + `Text`.

```jsx
import { Hint } from '@semcore/typography';
<Hint>
  <Hint.Addon />
  <Hint.Text />
</Hint>;
```

@typescript IHintProps

@## FormatText

A wrapper component required to add styles to native tags.

> 💡 Note that the component is in another package `@semcore/format-text`.

```jsx
import FormatText from '@semcore/format-text';
<FormatText />;
```

@typescript IFormatTextProps
