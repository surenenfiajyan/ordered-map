# OrderedMap
## Description
An implementation of an ordered map in JS.
## How to use
Modern JS supports [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object, which is useful in a lot of cases as a fast associative key - value storage. However, it doesn't support ordering by keys. OrderedMap adds this functionality, it supports all the methods that a normal Map has and is compatible with it, with the only limitation that the iteration is not guaranteed to be correct when the map is modified during iteration (this is a performance and memory usage tradeoff, I might work on this in the future).

It adds additional functionality that keeps the keys ordered.

### Methods / properties
* ```constructor()```
    #### Description
	The OrderedMap constructor.
	#### Signatures
	```
	constructor()
	constructor(iterable)
	constructor(comparatorFn)
	constructor(iterable, comparatorFn)
	```
	```iterable``` is an Array or other iterable object whose elements are key-value pairs. (For example, arrays with two elements, such as ```[[ 1, 'one' ],[ 2, 'two' ]]```).

	```comparatorFn``` is a custom function that determines the order of the elements, it works exactly like the passed callback in [Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). 
	
	If the only argument is a function (```typeof arg === 'function'```), it will be recognized as comparator, otherwise, as an iterator.
	___
* ```size```
	#### Description
	The number of elements in this map.
	___
* ```has(key)```
	#### Description
	Checks if a given key exists in the map. Returns ```true``` if present or ```false``` if not.
___
* ```get(key)```
	#### Description
	Searches for a given key. Returns the associated value if present or ```undefined``` if not.
	___
* ```set(key, value)```
	#### Description
	Associates the given key with value. Returns the map object itself.
	___
* ```getNth(index)```
	#### Description
	Searches for a value with its key ordering index. Returns the value if present or ```undefined``` if not. If ```index``` is negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.).
	___
* ```getNthKey(index)```
	#### Description
	Searches for a key with an ordering index. Returns the key if present or ```undefined``` if not. If ```index``` is negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.).
	___
* ```getNthEntry(index)```
	#### Description
	Searches for a ```[key, value]``` pair with an ordering index. Returns the pair if present or ```undefined``` if not. If ```index``` is negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.).
	___
* ```getOrInsert(key, defaultValue)```
	#### Description
	Searches for a given key. Returns the associated value if present. If the key isn't found, the key will be associated with ```defaultValue```, and the return value will be ```defaultValue```.
	___
* ```getOrInsertComputed(key, defaultCreator)```
	#### Description
	Searches for a given key. Returns the associated value if present. If the key isn't found, the key will be associated with the returned value of callback ```defaultValue```, and the return value will be that associated value.

	This is useful when the default value construction is expensive, otherwise use ```getOrInsert```.
	___
* ```getIndex(key)```
 	#### Signatures
	```
	getIndex(key)
	getIndex(key, isUpperBound)
	getIndex(key, isUpperBound, shouldMatch)
	```
	#### Description
	Returns the index of the closest less or equal key or the greater or equal key. If no such key is found, ```-1``` is returned.
	
	```key``` is the searched key. 
	
	```isUpperBound``` is ```false``` by default. If it is ```false```, the closest less or equal key index is searched, otherwise the greater or equal key index.

	```shouldMatch``` is ```false``` by default. If it is ```true```, only strictly equal key is searched.
	___
	```count``` is the maximum number of keys that should be taken, if omitted all the available keys are taken. If ```count``` is negative, the iteration order is reversed from the starting index.
	___
* ```getClosestKey(key)```
 	#### Signatures
	```
	getClosestKey(key)
	getClosestKey(key, isUpperBound)
	getClosestKey(key, isUpperBound, canMatch)
	```
	#### Description
	Searches for the closest key. Returns the closest key if it exists or ```undefined``` if not.

	```key``` is the key that the closest key is searched for.
	
	```isUpperBound``` is ```false``` by default. If it is ```false```, the closest less or equal key is searched, otherwise the greater or equal closest key.

	```canMatch``` is ```true``` by default. If it's ```false```, only strictly smaller or greater keys are searched.
	___
* ```getClosestValue(key)```
 	#### Signatures
	```
	getClosestValue(key)
	getClosestValue(key, isUpperBound)
	getClosestValue(key, isUpperBound, canMatch)
	```
	#### Description
	Searches for the closest key. Returns the associated value if the key exists or ```undefined``` if not.

	```key``` is the key that the closest key is searched for.
	
	```isUpperBound``` is ```false``` by default. If it is ```false```, the closest less or equal key is searched, otherwise the greater or equal closest key.

	```canMatch``` is ```true``` by default. If it's ```false```, only strictly smaller or greater keys are searched.
	___
* ```getClosestEntry(key)```
 	#### Signatures
	```
	getClosestEntry(key)
	getClosestEntry(key, isUpperBound)
	getClosestEntry(key, isUpperBound, canMatch)
	```
	#### Description
	Searches for the closest key. Returns the associated entry (```[key, value]``` pair) if the key exists or ```undefined``` if not.

	```key``` is the key that the closest key is searched for.
	
	```isUpperBound``` is ```false``` by default. If it is ```false```, the closest less or equal key is searched, otherwise the greater or equal closest key.

	```canMatch``` is ```true``` by default. If it's ```false```, only strictly smaller or greater keys are searched.
	___
* ```delete(key)```
	#### Description
	Deletes the key and the associated value from the map. Returns  ```true``` if the key existed right before calling this method or ```false``` if not.
	___
 * ```clear()```
	#### Description
	Clears the map.
	___
 * ```keys()```
 	#### Signatures
	```
	keys()
	keys(startIndex)
	keys(startIndex, count)
	```
	#### Description
	Returns an iterator for the keys.
	
	```startIndex``` is the first key order index that the iteration should start from, by default it's ```0```. If it's negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.). Note, that this still doesn't reverse the iteration order.
	
	```count``` is the maximum number of keys that should be taken, if omitted, all the available keys are taken. If ```count``` is negative, the iteration order is reversed from the starting index.
	___
* ```values()```
 	#### Signatures
	```
	values()
	values(startIndex)
	values(startIndex, count)
	```
	#### Description
	Returns an iterator for the values.
	
	```startIndex``` is the first value associated key order index that the iteration should start from, by default it's ```0```. If it's negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.). Note that this still doesn't reverse the iteration order.
	
	```count``` is the maximum number of values that should be taken, if omitted, all the available values are taken. If ```count``` is negative, the iteration order is reversed from the starting index.
	___
* ```entries()```
 	#### Signatures
	```
	entries()
	entries(startIndex)
	entries(startIndex, count)
	```
	#### Description
	Returns an iterator for the entries (```[key, value]``` pairs). 
	
	```startIndex``` is the first entry associated key order index that the iteration should start from, by default it's ```0```. If it's negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.). Note that this still doesn't reverse the iteration order.
	
	```count``` is the maximum number of entries that should be taken, if omitted, all the available entries are taken. If ```count``` is negative, the iteration order is reversed from the starting index.
	___
* ```forEach(callbackFn)```
 	#### Signatures
	```
	forEach(callbackFn)
	forEach(callbackFn, thisArg)
	forEach(callbackFn, thisArg, startIndex)
	forEach(callbackFn, thisArg, startIndex, count)
	```
	#### Description
	Executes a provided function once per each key/value pair in this map.

	```callbackFn(value, key, map)``` is a function to execute for each entry in the map. 
	
	```value``` is the value of each iteration.

	```key``` is the key of each iteration.

	```map``` is the map being iterated.

	```startIndex``` is the first entry associated key order index that the iteration should start from, by default it's ```0```. If it's negative, the n-th from the end is taken (i.e. -1 means the last, -2 means the second last, etc.). Note that this still doesn't reverse the iteration order.
	
	```count``` is the maximum number of entries that should be taken, if omitted, all the available entries are taken. If ```count``` is negative, the iteration order is reversed from the starting index.
	___
### Static methods / properties
* ```groupBy()```
	#### Signatures
	```
	groupBy(iterable, callbackFn)
	groupBy(iterable, callbackFn, comparatorFn)
	```
	#### Description
	Groups the elements of a given iterable using the values returned by a provided callback function. The final returned OrderedMap uses the unique values from the test function as keys, which can be used to get the array of elements in each group.


	```iterable``` is an iterable (such as an Array) whose elements will be grouped.

	```callbackFn(element, index)``` is a function to execute for each element in the iterable. It should return a value (object or primitive) indicating the group of the current element.

	```element``` is current element being processed.

	```index``` is the index of the current element being processed.

	```comparatorFn``` is a custom function that determines the order of the elements, it works exactly like the passed callback in [Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). 

## Algorithmic complexity (worst case)
|                            Operation                            |    Complexity    |
|:---------------------------------------------------------------:|:----------------:|
|                             Search                              |     `log(n)`     |
|                            Insertion                            |     `log(n)`     |
|                            Deletion                             |     `log(n)`     |
|         Construction from generic iterable / groupBy()          |   `n * log(n)`   |
| Construction from another OrderedMap (with the same comparator) |       `n`        |
|               Searching n-th key / value / entry                |     `log(n)`     |
|              Searching closest key / value / entry              |     `log(n)`     |
|                      Finding the key index                      |     `log(n)`     |
|                    Iteration from k-th entry                    | `count + log(n)` |

## License
[MIT license](https://github.com/surenenfiajyan/ordered-map/blob/main/LICENSE)
