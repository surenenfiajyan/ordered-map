# OrderedMap
## Description
An implementation of an orderd map in JS.
## How to use
Modern JS supports [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object, which is useful in a lot of cases as a fast associative key - value storage. However it doesn't support ordering by keys. OrderedMap adds this functionality, it supports all the methods that a normal Map has and is compatible with it, with the only limitation that the iteration is not guaranteed to be correct when the map is modified during iteration (this is a performance and memory usage tradeoff, I might work on this in the future).

It adds additional functionality that keeps the keys ordered.

### Methods / properties
* ```constructor()```
    #### Description
	The OrderedMap constructor.
	#### Signatures
	```
	constructor()
	constructor(iterable)
	constructor(comporatorFn)
	constructor(iterable, comporatorFn)
	```
	```iterable``` is an Array or other iterable object whose elements are key-value pairs. (For example, arrays with two elements, such as ```[[ 1, 'one' ],[ 2, 'two' ]]```).

	```comporatorFn``` is a custom function that determines the order of the elements, it works exactly like the passed callback in [Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). 
	
	If the only argument is a function (```typeof arg === 'function'```) it will be recognized as comporator, otherwise as an iterator.
	___
* ```size```
	#### Description
	The number of elements in this map.
	___
* ```get(key)```
	#### Description
	Searches for a given key. Returns the associated value if present or ```undefined``` if not.
	___
* ```has(key)```
	#### Description
	Checks if a given key exists in the map. Returns ```true``` if present or ```false``` if not.
	___
* ```set(key, value)```
	#### Description
	Associates the given key with value. Returns the map object itself.
	___
* ```getNth(index)```
	#### Description
	Searches for a value with its key ordering index. Returns the value if present or ```undefined``` if not.
	___
* ```getNthKey(index)```
	#### Description
	Searches for a key with an ordering index. Returns the key if present or ```undefined``` if not.
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
	
	```startIndex``` is the first key order index that the iteration should start from, by default it's ```0```. 
	
	```count``` is the maximum number of keys that should be taken, if ommitted all the available keys are taken.
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
	
	```startIndex``` is the first value associated key order index that the iteration should start from, by default it's ```0```. 
	
	```count``` is the maximum number of values that should be taken, if ommitted all the available values are taken.
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
	
	```startIndex``` is the first entry associated key order index that the iteration should start from, by default it's ```0```. 
	
	```count``` is the maximum number of entries that should be taken, if ommitted all the available entries are taken.
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

	```callbackFn(value, key, map)``` is afunction to execute for each entry in the map. 
	
	```value``` is the value of each iteration.

	```key``` is the key of each iteration.

	```map``` is the map being iterated.

	```startIndex``` is the first entry associated key order index that the iteration should start from, by default it's ```0```. 
	
	```count``` is the maximum number of entries that should be taken, if ommitted all the available entries are taken.
	___
### Static Methods / properties
* ```groupBy()```
	#### Signatures
	```
	groupBy(iterable, callbackFn)
	groupBy(iterable, callbackFn, comporatorFn)
	```
	#### Description
	Groups the elements of a given iterable using the values returned by a provided callback function. The final returned OrderedMap uses the unique values from the test function as keys, which can be used to get the array of elements in each group.


	```iterable``` is an iterable (such as an Array) whose elements will be grouped.

	```callbackFn(element, index)``` is a function to execute for each element in the iterable. It should return a value (object or primitive) indicating the group of the current element.

	```element``` is current element being processed.

	```index``` is the index of the current element being processed.

	```comporatorFn``` is a custom function that determines the order of the elements, it works exactly like the passed callback in [Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). 

## Algorithmic complexity (worst case)
| Operation | Complexity|
| :---:   | :---: |
| Search | `log(n)`   |
| Insertion | `log(n)`   |
| Deletion | `log(n)`   |
| Construction from generic iterable / groupBy() | `n * log(n)`   |
| Construction from another OrderedMap | `n`  |
| Searching n-th key / value | `log(n)`  |
| Iteration from n-th entry | `count + log(n)`|

## License
[MIT license](https://github.com/surenenfiajyan/ordered-map/blob/main/LICENSE)
