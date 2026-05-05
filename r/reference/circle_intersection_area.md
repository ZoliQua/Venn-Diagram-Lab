# Lens-shaped intersection area of two circles

Mirrors \`src/utils/proportionalLayout.ts circleIntersectionArea\` (web
tool) and Python \`circle_intersection_area\` byte-for-byte.

## Usage

``` r
circle_intersection_area(r1, r2, d)
```

## Arguments

- r1:

  Radius of circle 1 (positive numeric).

- r2:

  Radius of circle 2 (positive numeric).

- d:

  Distance between centers (non-negative numeric).

## Value

Numeric: 0 if circles are disjoint, pi \* min(r1,r2)^2 if fully nested,
else the lens-shaped intersection area.

## Examples

``` r
circle_intersection_area(1, 1, 1)   # ~ 1.228
#> [1] 1.22837
circle_intersection_area(1, 1, 3)   # 0 (disjoint)
#> [1] 0
```
