/**
 * An ordered map implementation that maintains keys in sorted order.
 * 
 * Similar to the native `Map`, but keys are automatically sorted based on a comparator function.
 * This makes it efficient for range queries, iteration in sorted order, and finding closest keys.
 * Uses a B+ tree data structure internally for optimal performance.
 * 
 * @template K The type of keys
 * @template V The type of values
 * 
 * @example
 * // Create with default comparator (sorts primitives by value and type)
 * const map = new OrderedMap();
 * map.set('b', 2);
 * map.set('a', 1);
 * map.set('c', 3);
 * 
 * // Iterate in sorted order
 * for (const [key, value] of map) {
 *   console.log(key, value); // a 1, b 2, c 3
 * }
 * 
 * @example
 * // Create with custom comparator
 * const map = new OrderedMap((a, b) => a - b);
 * 
 * @example
 * // Create from iterable
 * const entries = [['b', 2], ['a', 1], ['c', 3]];
 * const map = new OrderedMap(entries);
 */
export default class OrderedMap {
	static #minChildren = 24;
	static #splitChildren = 32;
	static #maxChildren = 64;

	#root = null;
	#compareKeys = OrderedMap.#comparator;

	static #comparator = (k1, k2) => {
		function getType(val) {
			return val === null ? 'null' : typeof val;
		}

		const t1 = getType(k1), t2 = getType(k2);
		const typeDiff = t1.localeCompare(t2)

		if (typeDiff) {
			return typeDiff;
		}

		switch (t1) {
			case 'object':
			case 'symbol':
			case 'function':
				const v1 = k1.valueOf();
				const v2 = k2.valueOf();
				const tv1 = getType(v1);
				const tv2 = getType(v2);
				const typeDiff2 = tv1.localeCompare(tv2);

				if (typeDiff2 || tv1 === 'object') {
					return typeDiff2;
				}

				return this.#comparator(v1, v2);
			case 'number':
				const nan1 = isNaN(k1), nan2 = isNaN(k2);
				const nanDiff = nan2 - nan1;

				if (nanDiff || nan1) {
					return nanDiff;
				}

				break;
		}

		if (k1 < k2) {
			return -1;
		} else if (k1 > k2) {
			return 1;
		}

		return 0;
	};

	#findIndex(key, node, exactMatch = false) {
		const keys = node.keys;

		if (!keys.length) {
			return -1;
		}

		let a = 0, b = keys.length;

		do {
			const c = (a + b) >> 1;
			const comp = this.#compareKeys(key, keys[c]);

			if (comp > 0) {
				a = c + 1;
			} else if (comp < 0) {
				b = c;
			} else {
				return c;
			}
		} while (a < b);

		return exactMatch ? -1 : a - 1;
	}

	#findContainingNode(key, exactMatch = false) {
		let node = this.#root;

		while (node?.children) {
			const index = this.#findIndex(key, node);

			if (index < 0) {
				if (exactMatch) {
					return null;
				}

				node = node.children[0];
			} else {
				node = node.children[index];
			}
		}

		return node;
	}

	#findContainingNodeByStartingIndex(index) {
		index = Math.floor(Number(index));
		let node = this.#root;

		if (isNaN(index)) {
			return [null, null];
		}

		if (index < 0) {
			index = this.size + index;
		}

		if (index < 0 || !node || node.count <= index) {
			return [null, null];
		}

		while (node.children) {
			for (node of node.children) {
				if (index >= node.count) {
					index -= node.count;
				} else {
					break;
				}
			}
		}

		return [node, index];
	}

	#internalGetOrInsert(key, value, caller) {
		let child = this.#findContainingNode(key);
		let returnValue = this;

		if (!child) {
			child = this.#root = {
				parent: null,
				prev: null,
				next: null,
				count: 0,
				keys: [],
				values: [],
				children: null,
			};
		}

		let index = this.#findIndex(key, child);

		if (index > -1 && this.#compareKeys(key, child.keys[index]) === 0) {
			if (caller === this.set) {
				child.values[index] = value;
			} else {
				returnValue = child.values[index];
			}
		} else {
			if (caller === this.getOrInsert) {
				returnValue = value;
			} else if (caller === this.getOrInsertComputed) {
				returnValue = value = value();
			}

			child.keys.splice(index + 1, 0, key);
			child.values.splice(index + 1, 0, value);

			do {
				let parent = child.parent;

				if (parent) {
					index = parent.children.indexOf(child);
					parent.keys[index] = child.keys[0];
				}

				if (child.keys.length > OrderedMap.#maxChildren) {
					if (!parent) {
						child.parent = parent = this.#root = {
							parent: null,
							prev: null,
							next: null,
							count: child.count,
							keys: [child.keys[0]],
							values: null,
							children: [child],
						};

						index = 0;
					}

					const values = child.values?.splice(OrderedMap.#splitChildren, OrderedMap.#maxChildren) ?? null;
					const children = child.children?.splice(OrderedMap.#splitChildren, OrderedMap.#maxChildren) ?? null;

					const nextChild = child.next = {
						parent,
						prev: child,
						next: child.next,
						count: values?.length ?? children.reduce((acc, cur) => acc + cur.count, 0),
						keys: child.keys.splice(OrderedMap.#splitChildren, OrderedMap.#maxChildren),
						values,
						children,
					};

					if (nextChild.next) {
						nextChild.next.prev = nextChild;
					}

					nextChild.children?.forEach(x => x.parent = nextChild);
					child.count -= nextChild.count;
					parent.keys.splice(index + 1, 0, nextChild.keys[0]);
					parent.children.splice(index + 1, 0, nextChild);
				}

				++child.count;
				child = parent;
			} while (child);
		}

		return returnValue;
	}

	#deepCopy(otherRoot) {
		this.#root = {
			parent: null,
			prev: null,
			next: null,
			count: otherRoot.count,
			keys: [...otherRoot.keys],
			values: otherRoot.values ? [...otherRoot.values] : null,
			children: otherRoot.children ? [] : null,
		}

		let layerFirstParentToCopy = otherRoot, layerFirstParent = this.#root;

		while (layerFirstParentToCopy.children) {
			let nodeToCopy = layerFirstParentToCopy = layerFirstParentToCopy.children[0], prev = null, parent = layerFirstParent;

			do {
				const node = {
					parent,
					prev,
					next: null,
					count: nodeToCopy.count,
					keys: [...nodeToCopy.keys],
					values: nodeToCopy.values ? [...nodeToCopy.values] : null,
					children: nodeToCopy.children ? [] : null,
				}

				parent.children.push(node);

				if (prev) {
					prev.next = node;
				}

				prev = node;
				const nextNodeToCopy = nodeToCopy.next;

				if (nextNodeToCopy?.parent !== nodeToCopy.parent) {
					parent = parent.next;
				}

				nodeToCopy = nextNodeToCopy;
			} while (nodeToCopy);

			layerFirstParent = layerFirstParent.children[0];
		}
	}

	/**
	 * Groups an iterable by key using a callback function and returns an OrderedMap.
	 * 
	 * @template T The type of items in the iterable
	 * @template K The type of keys returned by the callback
	 * 
	 * @static
	 * @param {Iterable<T>} iterable The iterable to group
	 * @param {(item: T, index: number) => K} callbackFn Function that returns the grouping key for each item
	 * @param {((k1: K, k2: K) => number) | null} [comparatorFn=null] Optional custom comparator function for keys.
	 *        If not provided, uses the default OrderedMap comparator.
	 * @returns {OrderedMap<K, T[]>} An OrderedMap where each key maps to an array of items for that group
	 * 
	 * @example
	 * const users = [
	 *   { name: 'Alice', department: 'Engineering' },
	 *   { name: 'Bob', department: 'Sales' },
	 *   { name: 'Charlie', department: 'Engineering' }
	 * ];
	 * 
	 * const byDept = OrderedMap.groupBy(users, user => user.department);
	 * // Map has keys: 'Engineering', 'Sales'
	 * // Map.get('Engineering') returns [{ name: 'Alice', ... }, { name: 'Charlie', ... }]
	 */
	static groupBy(iterable, callbackFn, comparatorFn = null) {
		const map = new OrderedMap(comparatorFn);

		let index = 0;

		for (const item of iterable) {
			const key = callbackFn(item, index++);

			let arr = map.get(key);

			if (!arr) {
				arr = [];
				map.set(key, arr);
			}

			arr.push(item);
		}

		return map;
	}

	/**
	 * Creates a new OrderedMap instance.
	 * 
	 * @overload
	 * @param {Iterable<[K, V]>} [iterable] An iterable of [key, value] pairs to populate the map
	 * 
	 * @overload
	 * @param {(k1: K, k2: K) => number} [comparatorFn] A comparator function for ordering keys
	 * 
	 * @overload
	 * @param {Iterable<[K, V]>} [iterable] An iterable of [key, value] pairs
	 * @param {(k1: K, k2: K) => number} [comparatorFn] A comparator function for ordering keys
	 * 
	 * @param {...*} args
	 *   - No arguments: Creates an empty map with default comparator
	 *   - Single argument (iterable): Creates a map from iterable entries with default comparator
	 *   - Single argument (function): Creates an empty map with custom comparator
	 *   - Two arguments: Creates a map from iterable entries with custom comparator
	 *   - Can also accept another OrderedMap to clone it
	 * 
	 * @throws {TypeError} If a comparator function is not a function when expected
	 * 
	 * @example
	 * // Empty map with default comparator
	 * const map1 = new OrderedMap();
	 * 
	 * @example
	 * // From iterable entries
	 * const map2 = new OrderedMap([['b', 2], ['a', 1]]);
	 * 
	 * @example
	 * // Custom comparator (numeric sort)
	 * const map3 = new OrderedMap((a, b) => a - b);
	 * 
	 * @example
	 * // From iterable with custom comparator
	 * const map4 = new OrderedMap([['b', 2], ['a', 1]], (a, b) => a - b);
	 * 
	 * @example
	 * // Clone another OrderedMap
	 * const map5 = new OrderedMap(map1);
	 */
	constructor(...args) {
		let iterable, compareKeys;

		if (args.length > 1) {
			iterable = args[0];
			this.#compareKeys = compareKeys = args[1];
		} else if (args.length === 1) {
			if (typeof args[0] === 'function') {
				this.#compareKeys = compareKeys = args[0];
			} else {
				iterable = args[0];
			}
		}

		if (iterable instanceof OrderedMap) {
			if (!compareKeys || compareKeys === iterable.#compareKeys) {
				this.#compareKeys = iterable.#compareKeys;

				if (iterable.#root) {
					this.#deepCopy(iterable.#root);
				}
			} else {
				iterable.forEach((v, k) => this.set(k, v));
			}

			return;
		}

		if (iterable) {
			for (const entry of iterable) {
				this.set(entry[0], entry[1]);
			}
		}
	}

	/**
	 * Returns the number of entries in the map.
	 * 
	 * @readonly
	 * @type {number}
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2]]);
	 * console.log(map.size); // 2
	 */
	get size() {
		return this.#root?.count ?? 0;
	}

	/**
	 * Checks whether a key exists in the map.
	 * 
	 * @param {K} key The key to check
	 * @returns {boolean} `true` if the key exists, `false` otherwise
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1]]);
	 * console.log(map.has('a')); // true
	 * console.log(map.has('b')); // false
	 */
	has(key) {
		const node = this.#findContainingNode(key, true);
		return !!node && this.#findIndex(key, node, true) > -1;
	}

	/**
	 * Gets the value associated with a key.
	 * 
	 * @param {K} key The key to look up
	 * @returns {V | undefined} The value associated with the key, or `undefined` if not found
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2]]);
	 * console.log(map.get('a')); // 1
	 * console.log(map.get('c')); // undefined
	 */
	get(key) {
		const node = this.#findContainingNode(key, true);

		if (node) {
			const index = this.#findIndex(key, node, true);

			if (index > -1) {
				return node.values[index];
			}
		}
	}

	/**
	 * Gets the value for a key, or inserts a default value if the key doesn't exist.
	 * 
	 * @param {K} key The key to look up or insert
	 * @param {V} defaultValue The value to insert if the key doesn't exist
	 * @returns {V} The existing value, or the inserted default value
	 * 
	 * @example
	 * const map = new OrderedMap();
	 * const val1 = map.getOrInsert('a', 42); // 42 (inserted)
	 * const val2 = map.getOrInsert('a', 99); // 42 (existing value)
	 */
	getOrInsert(key, defaultValue) {
		return this.#internalGetOrInsert(key, defaultValue, this.getOrInsert);
	}

	/**
	 * Gets the value for a key, or computes and inserts a value if the key doesn't exist.
	 * 
	 * The default creator function is only called if the key doesn't exist, making this
	 * efficient for expensive computations.
	 * 
	 * @param {K} key The key to look up or insert
	 * @param {() => V} defaultCreator A function that computes the value to insert
	 * @returns {V} The existing value, or the computed and inserted value
	 * @throws {TypeError} If defaultCreator is not a function
	 * 
	 * @example
	 * const map = new OrderedMap();
	 * const val1 = map.getOrInsertComputed('a', () => expensiveComputation()); // computed
	 * const val2 = map.getOrInsertComputed('a', () => expensiveComputation()); // cached
	 */
	getOrInsertComputed(key, defaultCreator) {
		if (typeof defaultCreator !== 'function') {
			throw new TypeError('The default creator is not a function');
		}

		return this.#internalGetOrInsert(key, defaultCreator, this.getOrInsertComputed);
	}

	/**
	 * Gets the value at the specified index (in sorted order).
	 * 
	 * Supports negative indices for counting from the end.
	 * 
	 * @param {number} index The zero-based index, or negative to count from the end
	 * @returns {V | undefined} The value at that index, or `undefined` if out of bounds
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * console.log(map.getNth(0)); // 1
	 * console.log(map.getNth(-1)); // 3
	 * console.log(map.getNth(10)); // undefined
	 */
	getNth(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);
		return node?.values[idx];
	}

	/**
	 * Gets the key at the specified index (in sorted order).
	 * 
	 * Supports negative indices for counting from the end.
	 * 
	 * @param {number} index The zero-based index, or negative to count from the end
	 * @returns {K | undefined} The key at that index, or `undefined` if out of bounds
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * console.log(map.getNthKey(0)); // 'a'
	 * console.log(map.getNthKey(-1)); // 'c'
	 */
	getNthKey(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);
		return node?.keys[idx];
	}

	/**
	 * Gets both key and value at the specified index (in sorted order).
	 * 
	 * Supports negative indices for counting from the end.
	 * 
	 * @param {number} index The zero-based index, or negative to count from the end
	 * @returns {[K, V] | undefined} A [key, value] tuple at that index, or `undefined` if out of bounds
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2]]);
	 * console.log(map.getNthEntry(0)); // ['a', 1]
	 * console.log(map.getNthEntry(-1)); // ['b', 2]
	 */
	getNthEntry(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);

		if (node) {
			return [node.keys[idx], node.values[idx]];
		}
	}

	/**
	 * Gets the index of a key or the position where a key would be inserted.
	 * 
	 * @param {K} key The key to find
	 * @param {boolean} [isUpperBound=false] If `true`, finds the upper bound (position after all equal keys).
	 *        If `false`, finds the lower bound (position of the first equal key).
	 * @param {boolean} [shouldMatch=false] If `true`, returns -1 when key is not found.
	 *        If `false`, returns the insertion position.
	 * @returns {number} The index of the key, insertion position, or -1 if not found (when `shouldMatch` is true)
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['c', 3]]);
	 * console.log(map.getIndex('a'));           // 0
	 * console.log(map.getIndex('b'));           // 1 (insertion position)
	 * console.log(map.getIndex('b', false, true)); // -1 (not found with shouldMatch=true)
	 */
	getIndex(key, isUpperBound = false, shouldMatch = false) {
		let node = this.#root;

		if (!node) {
			return - 1;
		}

		let index = 0, comp = -1;

		do {
			const upper = this.#findIndex(key, node);

			if (upper < 0) {
				index = -1;
				break;
			}

			if (node.children) {
				for (let i = 0; i < upper; ++i) {
					index += node.children[i].count;
				}

				node = node.children[upper];
			} else {
				index += upper;
				comp = this.#compareKeys(key, node.keys[upper]);
				break;
			}
		} while (true);

		if (comp) {
			if (shouldMatch) {
				index = -1;
			} else if (isUpperBound) {
				if (++index >= this.size) {
					index = -1;
				}
			}
		}

		return index;
	}

	/**
	 * Finds the key of the closest entry to the given key.
	 * 
	 * "Closest" means the key with the highest comparison result <= the given key (lower bound)
	 * or the lowest comparison result >= the given key (upper bound).
	 * 
	 * @param {K} key The reference key
	 * @param {boolean} [isUpperBound=false] If `true`, finds the upper bound (next key).
	 *        If `false`, finds the lower bound (previous or equal key).
	 * @param {boolean} [canMatch=true] If `true`, the exact key is a valid result.
	 *        If `false`, skips over the exact key.
	 * @returns {K | undefined} The closest key, or `undefined` if no such key exists
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['c', 3], ['e', 5]]);
	 * console.log(map.getClosestKey('d'));             // 'c' (lower bound)
	 * console.log(map.getClosestKey('d', true));       // 'e' (upper bound)
	 * console.log(map.getClosestKey('c', false, true)); // 'c' (exact match)
	 * console.log(map.getClosestKey('c', false, false)); // 'a' (skip exact)
	 */
	getClosestKey(key, isUpperBound = false, canMatch = true) {
		return this.getClosestEntry(key, isUpperBound, canMatch)?.[0];
	}

	/**
	 * Finds the value of the closest entry to the given key.
	 * 
	 * @param {K} key The reference key
	 * @param {boolean} [isUpperBound=false] If `true`, finds the upper bound (next entry).
	 *        If `false`, finds the lower bound (previous or equal entry).
	 * @param {boolean} [canMatch=true] If `true`, the exact key is a valid result.
	 *        If `false`, skips over the exact key.
	 * @returns {V | undefined} The value of the closest entry, or `undefined` if no such entry exists
	 * 
	 * @see {@link getClosestKey} for closer explanation of closest matching
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['c', 3], ['e', 5]]);
	 * console.log(map.getClosestValue('d'));      // 3
	 * console.log(map.getClosestValue('d', true)); // 5
	 */
	getClosestValue(key, isUpperBound = false, canMatch = true) {
		return this.getClosestEntry(key, isUpperBound, canMatch)?.[1];
	}

	/**
	 * Finds the closest [key, value] entry to the given key.
	 * 
	 * "Closest" means:
	 * - Lower bound (default): The entry with the largest key <= the query key
	 * - Upper bound: The entry with the smallest key >= the query key
	 * 
	 * @param {K} key The reference key
	 * @param {boolean} [isUpperBound=false] If `true`, finds the upper bound (next entry).
	 *        If `false`, finds the lower bound (previous or equal entry).
	 * @param {boolean} [canMatch=true] If `true`, the exact key is a valid result.
	 *        If `false`, skips over the exact key.
	 * @returns {[K, V] | undefined} A [key, value] tuple of the closest entry, 
	 *          or `undefined` if no such entry exists
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 'apple'], ['c', 'cherry'], ['e', 'elderberry']]);
	 * 
	 * // Range queries
	 * const lower = map.getClosestEntry('d', false); // ['c', 'cherry']
	 * const upper = map.getClosestEntry('d', true);  // ['e', 'elderberry']
	 * 
	 * // Find entries in range
	 * for (const [k, v] of map.entries(...)) {
	 *   if (k >= 'b' && k <= 'd') console.log(v);
	 * }
	 */
	getClosestEntry(key, isUpperBound = false, canMatch = true) {
		let node = this.#findContainingNode(key);

		if (node) {
			let index = this.#findIndex(key, node);
			const matches = index > -1 && this.#compareKeys(key, node.keys[index]) === 0;

			if (matches) {
				if (!canMatch) {
					if (isUpperBound) {
						++index;
					} else {
						--index;
					}
				}
			} else {
				if (isUpperBound) {
					++index;
				}
			}

			if (index < 0) {
				node = node.prev;
				index = node?.count - 1;
			} else if (index >= node.count) {
				node = node.next;
				index = 0;
			}

			if (node && index > -1 && index < node.count) {
				return [node.keys[index], node.values[index]];
			}
		}
	}

	/**
	 * Sets a key-value pair in the map.
	 * 
	 * If the key already exists, updates its value. If not, inserts the key in sorted order.
	 * 
	 * @param {K} key The key to set
	 * @param {V} value The value to associate with the key
	 * @returns {OrderedMap<K, V>} This map (for chaining)
	 * 
	 * @example
	 * const map = new OrderedMap();
	 * map.set('b', 2).set('a', 1).set('c', 3);
	 * 
	 * for (const [k, v] of map) {
	 *   console.log(k, v); // a 1, b 2, c 3 (sorted order)
	 * }
	 */
	set(key, value) {
		return this.#internalGetOrInsert(key, value, this.set);
	}

	/**
	 * Deletes a key and its associated value from the map.
	 * 
	 * @param {K} key The key to delete
	 * @returns {boolean} `true` if the key existed and was deleted, `false` otherwise
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2]]);
	 * console.log(map.delete('a')); // true
	 * console.log(map.delete('x')); // false
	 * console.log(map.size);        // 1
	 */
	delete(key) {
		let child = this.#findContainingNode(key, true);

		if (!child) {
			return false;
		}

		let index = this.#findIndex(key, child, true);

		if (index < 0) {
			return false;
		}

		child.keys.splice(index, 1);
		child.values.splice(index, 1);

		do {
			--child.count;
			const parent = child.parent;

			if (parent) {
				index = parent.children.indexOf(child);
				parent.keys[index] = child.keys[0];

				if (child.keys.length < OrderedMap.#minChildren) {
					let nextIndex = index + 1, nextChild = child.next;

					if (nextChild?.parent !== parent) {
						nextChild = child;
						child = child.prev;
						nextIndex = index--;
					}

					if (child.keys.length + nextChild.keys.length <= OrderedMap.#maxChildren) {
						child.next = nextChild.next;

						if (child.next) {
							child.next.prev = child;
						}

						child.count += nextChild.count;
						child.keys.push(...nextChild.keys);
						child.values?.push(...nextChild.values);
						child.children?.push(...nextChild.children);
						nextChild.children?.forEach(x => x.parent = child);
						parent.keys.splice(nextIndex, 1);
						parent.children.splice(nextIndex, 1);
					} else if (child.keys.length < nextChild.keys.length) {
						const itemsToMove = (nextChild.keys.length - child.keys.length) >> 1;
						const childrenToMove = nextChild.children?.splice(0, itemsToMove);
						const countChange = childrenToMove?.reduce((acc, cur) => acc + cur.count, 0) ?? itemsToMove;

						childrenToMove?.forEach(x => x.parent = child);

						child.keys.push(...nextChild.keys.splice(0, itemsToMove));
						child.values?.push(...nextChild.values.splice(0, itemsToMove));
						child.children?.push(...childrenToMove);

						child.count += countChange;
						nextChild.count -= countChange;
						parent.keys[nextIndex] = nextChild.keys[0];
					} else {
						const itemsToMove = (child.keys.length - nextChild.keys.length) >> 1;
						const childrenToMove = child.children?.splice(-itemsToMove);
						const countChange = childrenToMove?.reduce((acc, cur) => acc + cur.count, 0) ?? itemsToMove;

						childrenToMove?.forEach(x => x.parent = nextChild);

						nextChild.keys.unshift(...child.keys.splice(-itemsToMove));
						nextChild.values?.unshift(...child.values.splice(-itemsToMove));
						nextChild.children?.unshift(...childrenToMove);

						child.count -= countChange;
						nextChild.count += countChange;
						parent.keys[nextIndex] = nextChild.keys[0];
					}
				}
			}

			child = parent;
		} while (child);

		if (!this.#root.count) {
			this.#root = null;
		} else if (this.#root.children?.length === 1) {
			this.#root = this.#root.children[0];
			this.#root.parent = null;
		}

		return true;
	}

	/**
	 * Removes all entries from the map.
	 * 
	 * @returns {void}
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2]]);
	 * map.clear();
	 * console.log(map.size); // 0
	 */
	clear() {
		this.#root = null;
	}

	/**
	 * Returns an iterator that yields [key, value] pairs in sorted order.
	 * 
	 * This makes OrderedMap iterable with for...of loops and spread operators.
	 * 
	 * @returns {IterableIterator<[K, V]>} An iterator for [key, value] pairs
	 * 
	 * @example
	 * const map = new OrderedMap([['b', 2], ['a', 1]]);
	 * for (const [key, value] of map) {
	 *   console.log(key, value); // a 1, b 2
	 * }
	 */
	[Symbol.iterator]() {
		return this.entries();
	}

	/**
	 * Returns an iterator that yields keys in sorted order.
	 * 
	 * @param {number} [startIndex=0] Starting index (supports negative indices)
	 * @param {number | null} [count=null] Number of keys to yield. Null means all remaining.
	 *        Negative numbers count backwards from startIndex.
	 * @returns {IterableIterator<K>} An iterator for keys
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * 
	 * // All keys
	 * for (const key of map.keys()) {
	 *   console.log(key); // a, b, c
	 * }
	 * 
	 * // Keys from index 1, count 2
	 * for (const key of map.keys(1, 2)) {
	 *   console.log(key); // b, c
	 * }
	 * 
	 * // Last 2 keys backwards
	 * for (const key of map.keys(-2, -2)) {
	 *   console.log(key); // c, b
	 * }
	 */
	* keys(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield node.keys[idx];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else if (count > 0) {
			while (node) {
				do {
					if (--count < 0) {
						return;
					}

					yield node.keys[idx];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else {
			while (node) {
				do {
					if (++count > 0) {
						return;
					}

					yield node.keys[idx];
				} while (--idx >= 0);

				node = node.prev;
				idx = node?.count - 1;
			}
		}
	}

	/**
	 * Returns an iterator that yields values in sorted order (by key).
	 * 
	 * @param {number} [startIndex=0] Starting index (supports negative indices)
	 * @param {number | null} [count=null] Number of values to yield. Null means all remaining.
	 *        Negative numbers count backwards from startIndex.
	 * @returns {IterableIterator<V>} An iterator for values
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * 
	 * // All values (in sorted key order)
	 * for (const value of map.values()) {
	 *   console.log(value); // 1, 2, 3
	 * }
	 * 
	 * // Values from index 1, count 2
	 * for (const value of map.values(1, 2)) {
	 *   console.log(value); // 2, 3
	 * }
	 */
	* values(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield node.values[idx];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else if (count > 0) {
			while (node) {
				do {
					if (--count < 0) {
						return;
					}

					yield node.values[idx];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else {
			while (node) {
				do {
					if (++count > 0) {
						return;
					}

					yield node.values[idx];
				} while (--idx >= 0);

				node = node.prev;
				idx = node?.count - 1;
			}
		}
	}

	/**
	 * Returns an iterator that yields [key, value] pairs in sorted order.
	 * 
	 * @param {number} [startIndex=0] Starting index (supports negative indices)
	 * @param {number | null} [count=null] Number of entries to yield. Null means all remaining.
	 *        Negative numbers count backwards from startIndex.
	 * @returns {IterableIterator<[K, V]>} An iterator for [key, value] pairs
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * 
	 * // All entries
	 * for (const [key, value] of map.entries()) {
	 *   console.log(key, value); // a 1, b 2, c 3
	 * }
	 * 
	 * // Entries from index 1, count 2
	 * for (const [key, value] of map.entries(1, 2)) {
	 *   console.log(key, value); // b 2, c 3
	 * }
	 * 
	 * // Last entry backwards
	 * for (const [key, value] of map.entries(-1, -1)) {
	 *   console.log(key, value); // c 3
	 * }
	 */
	* entries(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield [node.keys[idx], node.values[idx]];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else if (count > 0) {
			while (node) {
				do {
					if (--count < 0) {
						return;
					}

					yield [node.keys[idx], node.values[idx]];
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else {
			while (node) {
				do {
					if (++count > 0) {
						return;
					}

					yield [node.keys[idx], node.values[idx]];
				} while (--idx >= 0);

				node = node.prev;
				idx = node?.count - 1;
			}
		}
	}

	/**
	 * Calls a callback for each entry in the map, in sorted order.
	 * 
	 * Similar to `Array.prototype.forEach`, but iterates entries in sorted key order.
	 * 
	 * @param {(value: V, key: K, map: OrderedMap<K, V>) => void} callbackFn Function to call for each entry.
	 *        Called with (value, key, map) - note the order differs from Array.forEach which uses (element, index, array).
	 * @param {*} [thisArg] Value to use as `this` when executing callbackFn
	 * @param {number} [startIndex=0] Starting index (supports negative indices)
	 * @param {number | null} [count=null] Number of entries to iterate. Null means all remaining.
	 *        Negative numbers count backwards from startIndex.
	 * @returns {void}
	 * 
	 * @example
	 * const map = new OrderedMap([['a', 1], ['b', 2], ['c', 3]]);
	 * 
	 * // Iterate all entries
	 * map.forEach((value, key) => {
	 *   console.log(key, value); // a 1, b 2, c 3
	 * });
	 * 
	 * // Iterate first 2 entries
	 * map.forEach((value, key) => {
	 *   console.log(key, value);
	 * }, null, 0, 2); // a 1, b 2
	 * 
	 * // Using thisArg
	 * const obj = { prefix: 'Item: ' };
	 * map.forEach(function(value, key) {
	 *   console.log(this.prefix + key);
	 * }, obj);
	 */
	forEach(callbackFn, thisArg, startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					callbackFn.call(thisArg, node.values[idx], node.keys[idx], this);
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else if (count > 0) {
			while (node) {
				do {
					if (--count < 0) {
						return;
					}

					callbackFn.call(thisArg, node.values[idx], node.keys[idx], this);
				} while (++idx < node.count);

				node = node.next;
				idx = 0;
			}
		} else {
			while (node) {
				do {
					if (++count > 0) {
						return;
					}

					callbackFn.call(thisArg, node.values[idx], node.keys[idx], this);
				} while (--idx >= 0);

				node = node.prev;
				idx = node?.count - 1;
			}
		}
	}
}
