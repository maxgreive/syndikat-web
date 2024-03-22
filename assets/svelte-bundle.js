
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    const API_URL = 'https://api.syndikat.golf/products';

    async function fetchProducts(query, endpoint) {
      const data = [];
      const response = await fetch(`${API_URL}/${endpoint}?q=${query}`, {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
      const result = await response.json();
      data.push(...result);
      return data;
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.59.2 */

    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    derived(loc, _loc => _loc.location);
    const querystring = derived(loc, _loc => _loc.querystring);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    /* src/ProductSearch.svelte generated by Svelte v3.59.2 */
    const file = "src/ProductSearch.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (93:12) {#if $products.length}
    function create_if_block_2(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*$products*/ ctx[2].length + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(")");
    			attr_dev(span, "class", "product-count svelte-p7i1bj");
    			add_location(span, file, 92, 34, 2250);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$products*/ 4 && t1_value !== (t1_value = /*$products*/ ctx[2].length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(93:12) {#if $products.length}",
    		ctx
    	});

    	return block;
    }

    // (112:4) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*$products*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_1_else = null;

    	if (!each_value_1.length) {
    		each_1_else = create_else_block_1(ctx);
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();

    			if (each_1_else) {
    				each_1_else.c();
    			}
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$products, stockStatusLabels, query, getProducts, defaultState*/ 775) {
    				each_value_1 = /*$products*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;

    				if (!each_value_1.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value_1.length) {
    					each_1_else = create_else_block_1(ctx);
    					each_1_else.c();
    					each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    				} else if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			if (each_1_else) each_1_else.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(112:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#if $loading}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = Array(6);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(105:4) {#if $loading}",
    		ctx
    	});

    	return block;
    }

    // (139:6) {:else}
    function create_else_block_1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*defaultState*/ ctx[1]) return create_if_block_1;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(139:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (158:8) {:else}
    function create_else_block_2(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Keine Produkte für ");
    			t1 = text(/*query*/ ctx[0]);
    			t2 = text(" gefunden.");
    			add_location(p, file, 158, 10, 4447);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*query*/ 1) set_data_dev(t1, /*query*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(158:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (140:8) {#if defaultState}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Suche zum Beispiel nach ");
    			a0 = element("a");
    			a0.textContent = "\"Westside Harp\"";
    			t2 = text("\n            oder\n            ");
    			a1 = element("a");
    			a1.textContent = "\"Innova Destroyer\"";
    			t4 = text(".\n          ");
    			attr_dev(a0, "href", null);
    			add_location(a0, file, 141, 36, 3974);
    			attr_dev(a1, "href", null);
    			add_location(a1, file, 149, 12, 4201);
    			add_location(p, file, 140, 10, 3934);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, a0);
    			append_dev(p, t2);
    			append_dev(p, a1);
    			append_dev(p, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(/*click_handler_1*/ ctx[14]), false, true, false, false),
    					listen_dev(a1, "click", prevent_default(/*click_handler_2*/ ctx[15]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(140:8) {#if defaultState}",
    		ctx
    	});

    	return block;
    }

    // (113:6) {#each $products as product}
    function create_each_block_1(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let img0_alt_value;
    	let a0_href_value;
    	let t0;
    	let div1;
    	let h2;
    	let a1;
    	let t1_value = /*product*/ ctx[23].title + "";
    	let t1;
    	let a1_href_value;
    	let t2;
    	let p;
    	let span;
    	let t3_value = /*stockStatusLabels*/ ctx[8][/*product*/ ctx[23].stockStatus] + "";
    	let t3;
    	let span_class_value;
    	let t4;
    	let strong;
    	let t5_value = /*product*/ ctx[23].price + "";
    	let t5;
    	let t6;
    	let t7;
    	let img1;
    	let img1_src_value;
    	let t8;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			a1 = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			strong = element("strong");
    			t5 = text(t5_value);
    			t6 = text(" €");
    			t7 = space();
    			img1 = element("img");
    			t8 = space();
    			if (!src_url_equal(img0.src, img0_src_value = /*product*/ ctx[23].image)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", img0_alt_value = /*product*/ ctx[23].title);
    			attr_dev(img0, "loading", "lazy");
    			attr_dev(img0, "width", "200");
    			attr_dev(img0, "height", "200");
    			add_location(img0, file, 117, 16, 3129);
    			attr_dev(a0, "href", a0_href_value = /*product*/ ctx[23].url);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "article__image svelte-p7i1bj");
    			add_location(a0, file, 116, 14, 3051);
    			attr_dev(div0, "class", "article__head");
    			add_location(div0, file, 115, 12, 3009);
    			attr_dev(a1, "href", a1_href_value = /*product*/ ctx[23].url);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-p7i1bj");
    			add_location(a1, file, 127, 41, 3445);
    			attr_dev(h2, "class", "article__title svelte-p7i1bj");
    			add_location(h2, file, 127, 14, 3418);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(`inventory status-${/*product*/ ctx[23].stockStatus}`) + " svelte-p7i1bj"));
    			add_location(span, file, 129, 16, 3542);
    			add_location(strong, file, 132, 16, 3698);
    			if (!src_url_equal(img1.src, img1_src_value = /*product*/ ctx[23].store)) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "store-logo svelte-p7i1bj");
    			attr_dev(img1, "alt", "Store Logo");
    			add_location(img1, file, 133, 16, 3749);
    			add_location(p, file, 128, 14, 3522);
    			attr_dev(div1, "class", "article__content");
    			add_location(div1, file, 126, 12, 3373);
    			attr_dev(div2, "class", "article__inner");
    			add_location(div2, file, 114, 10, 2968);
    			attr_dev(div3, "class", "article col col-4 col-d-6 col-t-12");
    			add_location(div3, file, 113, 8, 2909);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(h2, a1);
    			append_dev(a1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(p, span);
    			append_dev(span, t3);
    			append_dev(p, t4);
    			append_dev(p, strong);
    			append_dev(strong, t5);
    			append_dev(strong, t6);
    			append_dev(p, t7);
    			append_dev(p, img1);
    			append_dev(div3, t8);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$products*/ 4 && !src_url_equal(img0.src, img0_src_value = /*product*/ ctx[23].image)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*$products*/ 4 && img0_alt_value !== (img0_alt_value = /*product*/ ctx[23].title)) {
    				attr_dev(img0, "alt", img0_alt_value);
    			}

    			if (dirty & /*$products*/ 4 && a0_href_value !== (a0_href_value = /*product*/ ctx[23].url)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty & /*$products*/ 4 && t1_value !== (t1_value = /*product*/ ctx[23].title + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$products*/ 4 && a1_href_value !== (a1_href_value = /*product*/ ctx[23].url)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty & /*$products*/ 4 && t3_value !== (t3_value = /*stockStatusLabels*/ ctx[8][/*product*/ ctx[23].stockStatus] + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*$products*/ 4 && span_class_value !== (span_class_value = "" + (null_to_empty(`inventory status-${/*product*/ ctx[23].stockStatus}`) + " svelte-p7i1bj"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*$products*/ 4 && t5_value !== (t5_value = /*product*/ ctx[23].price + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*$products*/ 4 && !src_url_equal(img1.src, img1_src_value = /*product*/ ctx[23].store)) {
    				attr_dev(img1, "src", img1_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(113:6) {#each $products as product}",
    		ctx
    	});

    	return block;
    }

    // (106:6) {#each Array(6) as _}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			attr_dev(div0, "class", "skeleton-image svelte-p7i1bj");
    			add_location(div0, file, 107, 10, 2746);
    			attr_dev(div1, "class", "skeleton-text svelte-p7i1bj");
    			add_location(div1, file, 108, 10, 2791);
    			attr_dev(div2, "class", "skeleton col col-4 col-d-6 col-t-12 svelte-p7i1bj");
    			add_location(div2, file, 106, 8, 2686);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div2, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(106:6) {#each Array(6) as _}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let input;
    	let t0;
    	let button;
    	let t2;
    	let div0;
    	let h2;
    	let t3;
    	let t4;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t8;
    	let div2;
    	let div1;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$products*/ ctx[2].length && create_if_block_2(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*$loading*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Suchen";
    			t2 = space();
    			div0 = element("div");
    			h2 = element("h2");
    			t3 = text("Produkte");
    			if (if_block0) if_block0.c();
    			t4 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Standard";
    			option1 = element("option");
    			option1.textContent = "Preis aufsteigend";
    			option2 = element("option");
    			option2.textContent = "Preis absteigend";
    			t8 = space();
    			div2 = element("div");
    			div1 = element("div");
    			if_block1.c();
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "search__text");
    			attr_dev(input, "placeholder", "Suche nach Produkten");
    			add_location(input, file, 73, 2, 1869);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "button button--primary");
    			add_location(button, file, 79, 2, 1986);
    			attr_dev(form, "class", "search__group svelte-p7i1bj");
    			add_location(form, file, 72, 0, 1838);
    			attr_dev(h2, "class", "svelte-p7i1bj");
    			add_location(h2, file, 91, 2, 2211);
    			option0.__value = "default";
    			option0.value = option0.__value;
    			add_location(option0, file, 97, 4, 2392);
    			option1.__value = "price-ascending";
    			option1.value = option1.__value;
    			add_location(option1, file, 98, 4, 2438);
    			option2.__value = "price-descending";
    			option2.value = option2.__value;
    			add_location(option2, file, 99, 4, 2501);
    			attr_dev(select, "class", "svelte-p7i1bj");
    			if (/*$sort*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[13].call(select));
    			add_location(select, file, 96, 2, 2337);
    			attr_dev(div0, "class", "products-headline svelte-p7i1bj");
    			add_location(div0, file, 90, 0, 2177);
    			attr_dev(div1, "class", "row animate");
    			add_location(div1, file, 103, 2, 2605);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file, 102, 0, 2579);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, input);
    			set_input_value(input, /*query*/ ctx[0]);
    			append_dev(form, t0);
    			append_dev(form, button);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h2);
    			append_dev(h2, t3);
    			if (if_block0) if_block0.m(h2, null);
    			append_dev(div0, t4);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*$sort*/ ctx[3], true);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			if_block1.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(button, "click", prevent_default(/*click_handler*/ ctx[12]), false, true, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[13]),
    					listen_dev(select, "change", /*handleSort*/ ctx[10], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*query*/ 1 && input.value !== /*query*/ ctx[0]) {
    				set_input_value(input, /*query*/ ctx[0]);
    			}

    			if (/*$products*/ ctx[2].length) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(h2, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$sort*/ 8) {
    				select_option(select, /*$sort*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $querystring;
    	let $products;
    	let $sort;
    	let $loading;
    	validate_store(querystring, 'querystring');
    	component_subscribe($$self, querystring, $$value => $$invalidate(17, $querystring = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductSearch', slots, []);
    	const products = writable([]);
    	validate_store(products, 'products');
    	component_subscribe($$self, products, value => $$invalidate(2, $products = value));
    	const loading = writable(false);
    	validate_store(loading, 'loading');
    	component_subscribe($$self, loading, value => $$invalidate(4, $loading = value));
    	let originalProducts = [];
    	let defaultState = true;
    	const endpoints = ["crosslap", "frisbeeshop", "discgolfstore", "thrownatur", "insidethecircle"];
    	const stored = localStorage.sort;
    	const sort = writable(stored || "default");
    	validate_store(sort, 'sort');
    	component_subscribe($$self, sort, value => $$invalidate(3, $sort = value));
    	sort.subscribe(value => localStorage.sort = value);

    	const stockStatusLabels = {
    		available: "Auf Lager",
    		unavailable: "Nicht auf Lager",
    		unknown: "Unbekannt"
    	};

    	let query = "";

    	const getProducts = async () => {
    		if (!query) {
    			push("/");
    			$$invalidate(1, defaultState = true);
    			return products.set([]);
    		}

    		$$invalidate(1, defaultState = false);
    		push(`/?q=${encodeURIComponent(query)}`);
    		loading.set(true);
    		const promises = endpoints.map(endpoint => fetchProducts(query, endpoint));
    		const results = await Promise.all(promises);
    		products.set(results.flat());
    		loading.set(false);
    		originalProducts = results.flat();
    		handleSort();
    	};

    	const handleSort = () => {
    		if ($sort === "default") return set_store_value(products, $products = originalProducts, $products);

    		const sortedProducts = $products.sort((a, b) => {
    			if (parseFloat(a.price) < parseFloat(b.price)) return 1;
    			if (parseFloat(a.price) > parseFloat(b.price)) return -1;
    			return 0;
    		});

    		if ($sort === "price-ascending") return set_store_value(products, $products = sortedProducts.reverse(), $products);
    		return set_store_value(products, $products = sortedProducts, $products);
    	};

    	onMount(async () => {
    		$$invalidate(0, query = new URLSearchParams($querystring).get("q") || "");
    		await getProducts();
    		handleSort();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductSearch> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		query = this.value;
    		$$invalidate(0, query);
    	}

    	const click_handler = () => {
    		products.set(() => []);
    		getProducts();
    	};

    	function select_change_handler() {
    		$sort = select_value(this);
    		sort.set($sort);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(0, query = "Westside Harp");
    		getProducts();
    	};

    	const click_handler_2 = () => {
    		$$invalidate(0, query = "Innova Destroyer");
    		getProducts();
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		onMount,
    		fetchProducts,
    		push,
    		querystring,
    		products,
    		loading,
    		originalProducts,
    		defaultState,
    		endpoints,
    		stored,
    		sort,
    		stockStatusLabels,
    		query,
    		getProducts,
    		handleSort,
    		$querystring,
    		$products,
    		$sort,
    		$loading
    	});

    	$$self.$inject_state = $$props => {
    		if ('originalProducts' in $$props) originalProducts = $$props.originalProducts;
    		if ('defaultState' in $$props) $$invalidate(1, defaultState = $$props.defaultState);
    		if ('query' in $$props) $$invalidate(0, query = $$props.query);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*query*/ 1) {
    			$$invalidate(0, query = query.toLowerCase());
    		}
    	};

    	return [
    		query,
    		defaultState,
    		$products,
    		$sort,
    		$loading,
    		products,
    		loading,
    		sort,
    		stockStatusLabels,
    		getProducts,
    		handleSort,
    		input_input_handler,
    		click_handler,
    		select_change_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class ProductSearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductSearch",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    new ProductSearch({
      target: document.querySelector('#product-search-app'),
    });

})();
//# sourceMappingURL=svelte-bundle.js.map
