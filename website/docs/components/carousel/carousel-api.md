---
title: API
fileSource: carousel
---

@## Carousel

Main component.

```jsx
import Carousel from '@semcore/carousel';
<Carousel />;
```

@typescript ICarouselProps

@## Carousel.Container

`Carousel.Container` is a wrap over `Carousel.Item`. `Carousel.Item` doesn't have own API, extends to [Box](/layout/box-system/box-api/#a3cfce).

```jsx
import Carousel from '@semcore/carousel';
<Carousel.Container />;
```

@## Carousel.Item

`Carousel.Item` doesn't have own API, extends to [Box](/layout/box-system/box-api/#a3cfce).

```jsx
import Carousel from '@semcore/carousel';
<Carousel.Item />;
```

@## Carousel.Indicators

Component view for default dots. It doesn't have own API, extends to [Box](/layout/box-system/box-api/#a3cfce).

```jsx
import Carousel from '@semcore/carousel';
<Carousel.Indicators />;
```

@## Carousel.Prev, Carousel.Next

Component view for default Chevron icons. It doesn't have own API, extends to [Box](/layout/box-system/box-api/#a3cfce).

```jsx
import Carousel from '@semcore/carousel';
<Carousel.Prev />
<Carousel.Next />
```
