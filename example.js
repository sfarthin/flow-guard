// @flow

import type { Point } from './types';
const guard = require('./macro');

function g(a: any): Point {
  return guard<Point>({ x: 23, y: 65 });
}
