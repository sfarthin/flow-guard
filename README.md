# Flow Guard

Place runtime check for flow types with this babel macro.

```
import guard from "flow-guard/macro";

type Point = { x: number, y: number };

function g(a: any): Point {
  return guard<Point>({ x: 23, y: 65 });
}
```
