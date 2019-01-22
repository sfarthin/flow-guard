# Flow Guard

Flow Guard is a babel macro that adds a runtime guard for your flow types. This macro generates [decoders](https://nvie.com/posts/introducing-decoders/) based on your flow types and throws a runtime error if the unsafe data does not match. It is useful to type-check the boundaries of your application for incoming unsafe data (See [decoders](https://nvie.com/posts/introducing-decoders/)).

## Example guard macro

```javascript
// @flow
import guard from 'flow-guard/macro';

type Point = { x: number, y: number };

function handlePost(someUnsafeData: any): Point {
  return guard<Point>(someUnsafeData);
}
```

## Example decoder macro

```javascript
// @flow
import createDecoder from 'flow-guard/decoder.macro';
import { guard } from 'decoders';

type Point = { x: number, y: number };

const pointDecoder = createDecoder<Point>();

function handlePost(someUnsafeData: any): Point {
  return guard(pointDecoder)(someUnsafeData);
}
```

## Installation

Requires babel 7.x

```
npm install --save-dev babel-plugin-macros
npm install --save-dev flow-guard
```

Edit .babelrc to include the macros plugin: 'macros'
