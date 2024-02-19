type ValueOrArray<T> = T | ValueOrArray<T>[];

type NestedStringArray = ValueOrArray<string>;