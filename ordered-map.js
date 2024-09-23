class OrderedMap {
	static #minChildren = 32;
	static #maxChildren = 64;

	#root = null;
	#compareKeys = OrderedMap.#comporator;

	static #comporator = (k1, k2) => {
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

				return this.#comporator(v1, v2);
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

		return;
	}

	static groupBy(iterable, callbackFn, comporatorFn = null) {
		const map = new OrderedMap(comporatorFn);

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

	get size() {
		return this.#root?.count ?? 0;
	}

	get(key) {
		const node = this.#findContainingNode(key, true);

		if (node) {
			const index = this.#findIndex(key, node, true);

			if (index > -1) {
				return node.values[index];
			}
		}
	}

	has(key) {
		const node = this.#findContainingNode(key, true);
		return !!node && this.#findIndex(key, node, true) > -1;
	}

	getNth(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);
		return node?.values[idx];
	}

	getNthKey(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);
		return node?.keys[idx];
	}

	getNthEntry(index) {
		const [node, idx] = this.#findContainingNodeByStartingIndex(index);

		if (node) {
			return [node.keys[idx], node.values[idx]];
		}
	}

	set(key, value) {
		let child = this.#findContainingNode(key);

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
			child.values[index] = value;
		} else {
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

					const values = child.values?.splice(OrderedMap.#minChildren, OrderedMap.#maxChildren) ?? null;
					const children = child.children?.splice(OrderedMap.#minChildren, OrderedMap.#maxChildren) ?? null;

					const nextChild = child.next = {
						parent,
						prev: child,
						next: child.next,
						count: values?.length ?? children.reduce((acc, cur) => acc + cur.count, 0),
						keys: child.keys.splice(OrderedMap.#minChildren, OrderedMap.#maxChildren),
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

		return this;
	}

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


	clear() {
		this.#root = null;
	}

	[Symbol.iterator]() {
		return this.entries();
	}

	* keys(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield node.keys[idx];
				} while (++idx < node.keys.length);

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
				} while (++idx < node.keys.length);

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
				idx = node?.keys.length - 1;
			}
		}
	}

	* values(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield node.values[idx];
				} while (++idx < node.keys.length);

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
				} while (++idx < node.keys.length);

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
				idx = node?.keys.length - 1;
			}
		}
	}

	* entries(startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					yield [node.keys[idx], node.values[idx]];
				} while (++idx < node.keys.length);

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
				} while (++idx < node.keys.length);

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
				idx = node?.keys.length - 1;
			}
		}
	}

	forEach(callbackFn, thisArg, startIndex = 0, count = null) {
		let [node, idx] = this.#findContainingNodeByStartingIndex(startIndex);
		count = count != null ? Math.floor(Number(count)) : null;

		if (count === null) {
			while (node) {
				do {
					callbackFn.call(thisArg, node.values[idx], node.keys[idx], this);
				} while (++idx < node.keys.length);

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
				} while (++idx < node.keys.length);

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
				idx = node?.keys.length - 1;
			}
		}
	}
}
