
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
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

    const API_URL = '//localhost:1337';

    async function fetchProducts(query, endpoint) {
      const data = [];
      const response = await fetch(`${API_URL}/products/${endpoint}/${query}`, {
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

    /* src/SearchExample.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/SearchExample.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*text*/ ctx[1]);
    			attr_dev(button, "class", "button--text");
    			add_location(button, file$3, 5, 0, 96);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*click_handler*/ ctx[3]), false, true, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) set_data_dev(t, /*text*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SearchExample', slots, []);
    	let { query, text, cb } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (query === undefined && !('query' in $$props || $$self.$$.bound[$$self.$$.props['query']])) {
    			console.warn("<SearchExample> was created without expected prop 'query'");
    		}

    		if (text === undefined && !('text' in $$props || $$self.$$.bound[$$self.$$.props['text']])) {
    			console.warn("<SearchExample> was created without expected prop 'text'");
    		}

    		if (cb === undefined && !('cb' in $$props || $$self.$$.bound[$$self.$$.props['cb']])) {
    			console.warn("<SearchExample> was created without expected prop 'cb'");
    		}
    	});

    	const writable_props = ['query', 'text', 'cb'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SearchExample> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		$$invalidate(0, query = text);
    		cb();
    	};

    	$$self.$$set = $$props => {
    		if ('query' in $$props) $$invalidate(0, query = $$props.query);
    		if ('text' in $$props) $$invalidate(1, text = $$props.text);
    		if ('cb' in $$props) $$invalidate(2, cb = $$props.cb);
    	};

    	$$self.$capture_state = () => ({ query, text, cb });

    	$$self.$inject_state = $$props => {
    		if ('query' in $$props) $$invalidate(0, query = $$props.query);
    		if ('text' in $$props) $$invalidate(1, text = $$props.text);
    		if ('cb' in $$props) $$invalidate(2, cb = $$props.cb);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [query, text, cb, click_handler];
    }

    class SearchExample extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { query: 0, text: 1, cb: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SearchExample",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get query() {
    		throw new Error("<SearchExample>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set query(value) {
    		throw new Error("<SearchExample>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<SearchExample>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<SearchExample>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cb() {
    		throw new Error("<SearchExample>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cb(value) {
    		throw new Error("<SearchExample>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ShopLogos.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/ShopLogos.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (7:4) {#if shop.logo}
    function create_if_block$2(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let a_href_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			t = space();
    			if (!src_url_equal(img.src, img_src_value = `/assets/images/logos/${/*shop*/ ctx[1].logo}`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = `${/*shop*/ ctx[1].name} Logo`);
    			attr_dev(img, "class", "svelte-1360ui8");
    			add_location(img, file$2, 9, 11, 199);
    			attr_dev(a, "href", a_href_value = /*shop*/ ctx[1].url);
    			attr_dev(a, "class", "svelte-1360ui8");
    			add_location(a, file$2, 8, 8, 169);
    			attr_dev(div, "class", "supported-shop svelte-1360ui8");
    			add_location(div, file$2, 7, 6, 132);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeShops*/ 1 && !src_url_equal(img.src, img_src_value = `/assets/images/logos/${/*shop*/ ctx[1].logo}`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*activeShops*/ 1 && img_alt_value !== (img_alt_value = `${/*shop*/ ctx[1].name} Logo`)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*activeShops*/ 1 && a_href_value !== (a_href_value = /*shop*/ ctx[1].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(7:4) {#if shop.logo}",
    		ctx
    	});

    	return block;
    }

    // (6:2) {#each activeShops as shop}
    function create_each_block$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*shop*/ ctx[1].logo && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*shop*/ ctx[1].logo) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(6:2) {#each activeShops as shop}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let each_value = /*activeShops*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "supported-shops svelte-1360ui8");
    			add_location(div, file$2, 4, 0, 46);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*activeShops*/ 1) {
    				each_value = /*activeShops*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ShopLogos', slots, []);
    	let { activeShops } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (activeShops === undefined && !('activeShops' in $$props || $$self.$$.bound[$$self.$$.props['activeShops']])) {
    			console.warn("<ShopLogos> was created without expected prop 'activeShops'");
    		}
    	});

    	const writable_props = ['activeShops'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ShopLogos> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('activeShops' in $$props) $$invalidate(0, activeShops = $$props.activeShops);
    	};

    	$$self.$capture_state = () => ({ activeShops });

    	$$self.$inject_state = $$props => {
    		if ('activeShops' in $$props) $$invalidate(0, activeShops = $$props.activeShops);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [activeShops];
    }

    class ShopLogos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { activeShops: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ShopLogos",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get activeShops() {
    		throw new Error("<ShopLogos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeShops(value) {
    		throw new Error("<ShopLogos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const shops =
      [
        {
          "handle": "chooseyourdisc",
          "name": "Choose Your Disc",
          "disabled": false,
          "logo": "chooseyourdisc-light.png",
          "url": "https://www.chooseyourdisc.com/",
          "shipping": {
            "amount": 495,
            "info": " – kostenfrei ab 100 €"
          }
        },
        {
          "handle": "insidethecircle",
          "name": "Inside The Circle",
          "disabled": false,
          "logo": "insidethecircle-light.png",
          "url": "https://www.inside-the-circle.de/",
          "shipping": {
            "amount": 420,
            "info": " – kostenfrei ab 100 €"
          }
        },
        {
          "handle": "discwolf",
          "name": "Disc Wolf",
          "disabled": false,
          "logo": "discwolf-light.png",
          "url": "https://www.discwolf.com/",
          "shipping": {
            "amount": 390,
            "info": " – kostenfrei ab 49 €"
          }
        },
        {
          "handle": "frisbeeshop",
          "name": "Frisbeeshop.com",
          "disabled": false,
          "logo": "frisbeeshop-light.png",
          "url": "https://www.frisbeeshop.com/",
          "shipping": {
            "amount": 595,
          }
        },
        {
          "handle": "discgolfstore",
          "name": "Discgolfstore",
          "disabled": false,
          "logo": "discgolfstore-light.png",
          "url": "https://www.discgolfstore.de/",
          "shipping": {
            "amount": 395,
            "info": " – kostenfrei ab 50 €"
          }
        },
        {
          "handle": "crosslap",
          "name": "Crosslap",
          "disabled": false,
          "logo": "crosslap-light.png",
          "url": "https://www.discgolf-shop.de/",
          "shipping": {
            "amount": 395,
            "info": " – kostenfrei ab 100 €"
          }
        },
        {
          "handle": "thrownatur",
          "name": "Thrownatur",
          "disabled": false,
          "logo": "thrownatur-light.png",
          "url": "https://www.thrownatur-discgolf.de/de/",
          "shipping": {
            "amount": 595,
            "info": " – 2,99 € bis 400g"
          }
        },
        {
          "handle": "birdieshop",
          "name": "Birdie Shop",
          "disabled": false,
          "logo": "birdieshop-light.png",
          "url": "https://www.birdie-shop.com/",
          "shipping": {
            "amount": 595,
            "info": " – kostenfrei ab 75 €"
          }
        },
        {
          "handle": "discgolf4you",
          "name": "Discgolf 4 You",
          "disabled": false,
          "logo": "discgolf4you-light.png",
          "url": "https://www.discgolf4you.com/",
          "shipping": {
            "amount": 890,
            "info": ""
          }
        },
        {
          "handle": "hyzerstore",
          "name": "Hyzerstore",
          "disabled": false,
          "logo": "hyzerstore-light.png",
          "url": "https://www.hyzer-store.de/",
          "shipping": {
            "amount": 395,
            "info": ""
          }
        },
      ];

    /* src/ProductCard.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1 } = globals;
    const file$1 = "src/ProductCard.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (51:8) {#if product.flightNumbers}
    function create_if_block_1$1(ctx) {
    	let ul;
    	let each_value = Object.values(/*product*/ ctx[0].flightNumbers);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "article__flight-numbers svelte-1i3d067");
    			add_location(ul, file$1, 51, 10, 1209);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parseInt, Object, product*/ 1) {
    				each_value = Object.values(/*product*/ ctx[0].flightNumbers);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(51:8) {#if product.flightNumbers}",
    		ctx
    	});

    	return block;
    }

    // (54:14) {#if flightNumber}
    function create_if_block_2$1(ctx) {
    	let li;
    	let t_value = parseInt(/*flightNumber*/ ctx[5]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1i3d067");
    			add_location(li, file$1, 54, 16, 1368);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*product*/ 1 && t_value !== (t_value = parseInt(/*flightNumber*/ ctx[5]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(54:14) {#if flightNumber}",
    		ctx
    	});

    	return block;
    }

    // (53:12) {#each Object.values(product.flightNumbers) as flightNumber}
    function create_each_block$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*flightNumber*/ ctx[5] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*flightNumber*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(53:12) {#each Object.values(product.flightNumbers) as flightNumber}",
    		ctx
    	});

    	return block;
    }

    // (68:6) {#if shop && shop.shipping && shop.shipping.amount}
    function create_if_block$1(ctx) {
    	let span;
    	let i;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			attr_dev(i, "class", "ion ion-md-information-circle-outline");
    			add_location(i, file$1, 71, 11, 1891);
    			attr_dev(span, "class", "tooltip svelte-1i3d067");
    			attr_dev(span, "data-tippy-content", `Versand ${/*EURO*/ ctx[3].format(/*shop*/ ctx[1].shipping.amount / 100)}${/*shop*/ ctx[1].shipping.info}`);
    			add_location(span, file$1, 68, 8, 1743);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(68:6) {#if shop && shop.shipping && shop.shipping.amount}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let a0;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let img0_alt_value;
    	let a0_href_value;
    	let t1;
    	let t2;
    	let div1;
    	let h2;
    	let a1;
    	let t3_value = /*product*/ ctx[0].title + "";
    	let t3;
    	let a1_href_value;
    	let t4;
    	let p;
    	let span;
    	let t5_value = /*stockStatusLabels*/ ctx[2][/*product*/ ctx[0].stockStatus] + "";
    	let t5;
    	let span_class_value;
    	let t6;
    	let strong;
    	let t7_value = /*EURO*/ ctx[3].format(/*product*/ ctx[0].price / 100) + "";
    	let t7;
    	let t8;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let img2;
    	let img2_src_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*product*/ ctx[0].flightNumbers && create_if_block_1$1(ctx);
    	let if_block1 = /*shop*/ ctx[1] && /*shop*/ ctx[1].shipping && /*shop*/ ctx[1].shipping.amount && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			a1 = element("a");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			span = element("span");
    			t5 = text(t5_value);
    			t6 = space();
    			strong = element("strong");
    			t7 = text(t7_value);
    			t8 = space();
    			img1 = element("img");
    			t9 = space();
    			img2 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = /*product*/ ctx[0].image || "/assets/images/image-not-found.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", img0_alt_value = /*product*/ ctx[0].title);
    			attr_dev(img0, "loading", "lazy");
    			attr_dev(img0, "width", "200");
    			attr_dev(img0, "height", "200");
    			add_location(img0, file$1, 59, 8, 1480);
    			attr_dev(a0, "href", a0_href_value = /*product*/ ctx[0].url);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "article__image svelte-1i3d067");
    			add_location(a0, file$1, 44, 6, 1029);
    			attr_dev(div0, "class", "article__head");
    			add_location(div0, file$1, 43, 4, 995);
    			attr_dev(a1, "href", a1_href_value = /*product*/ ctx[0].url);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-1i3d067");
    			add_location(a1, file$1, 77, 8, 2061);
    			attr_dev(h2, "class", "article__title svelte-1i3d067");
    			add_location(h2, file$1, 76, 6, 2025);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(`inventory status-${/*product*/ ctx[0].stockStatus}`) + " svelte-1i3d067"));
    			add_location(span, file$1, 82, 8, 2202);
    			add_location(strong, file$1, 85, 8, 2334);
    			if (!src_url_equal(img1.src, img1_src_value = `/assets/images/logos/${/*product*/ ctx[0].store}-light.png`)) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "store-logo hide-dark svelte-1i3d067");
    			attr_dev(img1, "alt", "Store Logo");
    			add_location(img1, file$1, 86, 8, 2394);
    			if (!src_url_equal(img2.src, img2_src_value = `/assets/images/logos/${/*product*/ ctx[0].store}-dark.png`)) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "store-logo hide-light svelte-1i3d067");
    			attr_dev(img2, "alt", "Store Logo");
    			add_location(img2, file$1, 91, 8, 2550);
    			add_location(p, file$1, 81, 6, 2190);
    			attr_dev(div1, "class", "article__content");
    			add_location(div1, file$1, 75, 4, 1988);
    			attr_dev(div2, "class", "article__inner");
    			add_location(div2, file$1, 42, 2, 962);
    			attr_dev(div3, "class", "article col col-4 col-d-6 col-t-12");
    			add_location(div3, file$1, 41, 0, 911);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, a0);
    			if (if_block0) if_block0.m(a0, null);
    			append_dev(a0, t0);
    			append_dev(a0, img0);
    			append_dev(div0, t1);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(h2, a1);
    			append_dev(a1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p);
    			append_dev(p, span);
    			append_dev(span, t5);
    			append_dev(p, t6);
    			append_dev(p, strong);
    			append_dev(strong, t7);
    			append_dev(p, t8);
    			append_dev(p, img1);
    			append_dev(p, t9);
    			append_dev(p, img2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						a0,
    						"click",
    						function () {
    							if (is_function(/*trackProduct*/ ctx[4](/*product*/ ctx[0]))) /*trackProduct*/ ctx[4](/*product*/ ctx[0]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						a1,
    						"click",
    						function () {
    							if (is_function(/*trackProduct*/ ctx[4](/*product*/ ctx[0]))) /*trackProduct*/ ctx[4](/*product*/ ctx[0]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*product*/ ctx[0].flightNumbers) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(a0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*product*/ 1 && !src_url_equal(img0.src, img0_src_value = /*product*/ ctx[0].image || "/assets/images/image-not-found.jpg")) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*product*/ 1 && img0_alt_value !== (img0_alt_value = /*product*/ ctx[0].title)) {
    				attr_dev(img0, "alt", img0_alt_value);
    			}

    			if (dirty & /*product*/ 1 && a0_href_value !== (a0_href_value = /*product*/ ctx[0].url)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (/*shop*/ ctx[1] && /*shop*/ ctx[1].shipping && /*shop*/ ctx[1].shipping.amount) if_block1.p(ctx, dirty);
    			if (dirty & /*product*/ 1 && t3_value !== (t3_value = /*product*/ ctx[0].title + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*product*/ 1 && a1_href_value !== (a1_href_value = /*product*/ ctx[0].url)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty & /*product*/ 1 && t5_value !== (t5_value = /*stockStatusLabels*/ ctx[2][/*product*/ ctx[0].stockStatus] + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*product*/ 1 && span_class_value !== (span_class_value = "" + (null_to_empty(`inventory status-${/*product*/ ctx[0].stockStatus}`) + " svelte-1i3d067"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*product*/ 1 && t7_value !== (t7_value = /*EURO*/ ctx[3].format(/*product*/ ctx[0].price / 100) + "")) set_data_dev(t7, t7_value);

    			if (dirty & /*product*/ 1 && !src_url_equal(img1.src, img1_src_value = `/assets/images/logos/${/*product*/ ctx[0].store}-light.png`)) {
    				attr_dev(img1, "src", img1_src_value);
    			}

    			if (dirty & /*product*/ 1 && !src_url_equal(img2.src, img2_src_value = `/assets/images/logos/${/*product*/ ctx[0].store}-dark.png`)) {
    				attr_dev(img2, "src", img2_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductCard', slots, []);

    	onMount(async () => {
    		tippy(".tooltip", {}); // offset: [0, -4],
    	});

    	let { product } = $$props;
    	const shop = shops.find(shop => shop.handle === product.store);

    	const stockStatusLabels = {
    		available: "Auf Lager",
    		unavailable: "Nicht auf Lager",
    		unknown: "Unbekannt"
    	};

    	const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

    	const trackProduct = product => {
    		window.plausible = window.plausible || function () {
    			(window.plausible.q = window.plausible.q || []).push(arguments);
    		};

    		window.plausible("product-click", {
    			props: {
    				product: product.title,
    				store: product.store,
    				price: product.price / 100,
    				currency: "EUR",
    				url: product.url
    			}
    		});
    	};

    	$$self.$$.on_mount.push(function () {
    		if (product === undefined && !('product' in $$props || $$self.$$.bound[$$self.$$.props['product']])) {
    			console.warn("<ProductCard> was created without expected prop 'product'");
    		}
    	});

    	const writable_props = ['product'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('product' in $$props) $$invalidate(0, product = $$props.product);
    	};

    	$$self.$capture_state = () => ({
    		shops,
    		onMount,
    		product,
    		shop,
    		stockStatusLabels,
    		EURO,
    		trackProduct
    	});

    	$$self.$inject_state = $$props => {
    		if ('product' in $$props) $$invalidate(0, product = $$props.product);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [product, shop, stockStatusLabels, EURO, trackProduct];
    }

    class ProductCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { product: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductCard",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get product() {
    		throw new Error("<ProductCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set product(value) {
    		throw new Error("<ProductCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ProductSearch.svelte generated by Svelte v3.59.2 */
    const file = "src/ProductSearch.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	return child_ctx;
    }

    // (100:2) {#if query && !$loading}
    function create_if_block_7(ctx) {
    	let div;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "ion ion-md-close");
    			add_location(i, file, 105, 6, 2900);
    			attr_dev(div, "class", "search__close svelte-u5t6r2");
    			add_location(div, file, 100, 4, 2775);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*click_handler*/ ctx[15], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(100:2) {#if query && !$loading}",
    		ctx
    	});

    	return block;
    }

    // (132:4) {:else}
    function create_else_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Los geht's!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(132:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (130:4) {#if $loading || $products.length}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Produkte");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(130:4) {#if $loading || $products.length}",
    		ctx
    	});

    	return block;
    }

    // (146:31) 
    function create_if_block_5(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*$products*/ ctx[4].length + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(")");
    			attr_dev(span, "class", "product-count svelte-u5t6r2");
    			add_location(span, file, 146, 6, 3825);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$products*/ 16 && t1_value !== (t1_value = /*$products*/ ctx[4].length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(146:31) ",
    		ctx
    	});

    	return block;
    }

    // (135:4) {#if shopCount < shopHandles.length}
    function create_if_block_4(ctx) {
    	let svg;
    	let circle0;
    	let circle1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr_dev(circle0, "class", "bg svelte-u5t6r2");
    			add_location(circle0, file, 142, 8, 3708);
    			attr_dev(circle1, "class", "fg svelte-u5t6r2");
    			add_location(circle1, file, 143, 8, 3745);
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "class", "circular-progress svelte-u5t6r2");
    			set_style(svg, "--progress", /*progress*/ ctx[3]);
    			add_location(svg, file, 135, 6, 3547);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle0);
    			append_dev(svg, circle1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*progress*/ 8) {
    				set_style(svg, "--progress", /*progress*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(135:4) {#if shopCount < shopHandles.length}",
    		ctx
    	});

    	return block;
    }

    // (151:2) {#if $loading}
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("loading ");
    			t1 = text(/*$loading*/ ctx[6]);
    			t2 = text(" …");
    			attr_dev(div, "class", "currently-fetching svelte-u5t6r2");
    			add_location(div, file, 151, 4, 3921);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$loading*/ 64) set_data_dev(t1, /*$loading*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(151:2) {#if $loading}",
    		ctx
    	});

    	return block;
    }

    // (155:2) {#if $products.length}
    function create_if_block_2(ctx) {
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Standard";
    			option1 = element("option");
    			option1.textContent = "Verfügbarkeit";
    			option2 = element("option");
    			option2.textContent = "Preis aufsteigend";
    			option3 = element("option");
    			option3.textContent = "Preis absteigend";
    			option0.__value = "default";
    			option0.value = option0.__value;
    			add_location(option0, file, 156, 6, 4075);
    			option1.__value = "availability";
    			option1.value = option1.__value;
    			add_location(option1, file, 157, 6, 4123);
    			option2.__value = "price-ascending";
    			option2.value = option2.__value;
    			add_location(option2, file, 158, 6, 4181);
    			option3.__value = "price-descending";
    			option3.value = option3.__value;
    			add_location(option3, file, 159, 6, 4246);
    			if (/*$sort*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[19].call(select));
    			add_location(select, file, 155, 4, 4018);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			select_option(select, /*$sort*/ ctx[5], true);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[19]),
    					listen_dev(select, "change", /*handleSort*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$sort*/ 32) {
    				select_option(select, /*$sort*/ ctx[5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(155:2) {#if $products.length}",
    		ctx
    	});

    	return block;
    }

    // (173:2) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*$products*/ ctx[4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

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

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$products, activeShops, getProducts, query, defaultState*/ 8342) {
    				each_value_1 = /*$products*/ ctx[4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value_1.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value_1.length) {
    					each_1_else = create_else_block_1(ctx);
    					each_1_else.c();
    					transition_in(each_1_else, 1);
    					each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    				} else if (each_1_else) {
    					group_outros();

    					transition_out(each_1_else, 1, 1, () => {
    						each_1_else = null;
    					});

    					check_outros();
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
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
    		source: "(173:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (166:2) {#if $loading && shopCount < shopHandles.length && $products.length === 0}
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
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(166:2) {#if $loading && shopCount < shopHandles.length && $products.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (176:4) {:else}
    function create_else_block_1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block_2];
    	const if_blocks = [];

    	function select_block_type_3(ctx, dirty) {
    		if (/*defaultState*/ ctx[2] || !/*query*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_3(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_3(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(176:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (199:6) {:else}
    function create_else_block_2(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text("Keine Produkte für ");
    			t1 = text(/*query*/ ctx[1]);
    			t2 = text(" gefunden.");
    			t3 = space();
    			add_location(p, file, 200, 10, 5528);
    			attr_dev(div, "class", "col");
    			add_location(div, file, 199, 8, 5500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*query*/ 2) set_data_dev(t1, /*query*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(199:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (177:6) {#if defaultState || !query}
    function create_if_block_1(ctx) {
    	let div0;
    	let p0;
    	let t0;
    	let searchexample0;
    	let updating_query;
    	let t1;
    	let searchexample1;
    	let updating_query_1;
    	let t2;
    	let searchexample2;
    	let updating_query_2;
    	let t3;
    	let t4;
    	let div1;
    	let h3;
    	let t6;
    	let shoplogos;
    	let t7;
    	let div2;
    	let p1;
    	let t8;
    	let a;
    	let t10;
    	let t11;
    	let current;

    	function searchexample0_query_binding(value) {
    		/*searchexample0_query_binding*/ ctx[20](value);
    	}

    	let searchexample0_props = {
    		text: "Harp",
    		cb: /*getProducts*/ ctx[13]
    	};

    	if (/*query*/ ctx[1] !== void 0) {
    		searchexample0_props.query = /*query*/ ctx[1];
    	}

    	searchexample0 = new SearchExample({
    			props: searchexample0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(searchexample0, 'query', searchexample0_query_binding));

    	function searchexample1_query_binding(value) {
    		/*searchexample1_query_binding*/ ctx[21](value);
    	}

    	let searchexample1_props = {
    		text: "Raider",
    		cb: /*getProducts*/ ctx[13]
    	};

    	if (/*query*/ ctx[1] !== void 0) {
    		searchexample1_props.query = /*query*/ ctx[1];
    	}

    	searchexample1 = new SearchExample({
    			props: searchexample1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(searchexample1, 'query', searchexample1_query_binding));

    	function searchexample2_query_binding(value) {
    		/*searchexample2_query_binding*/ ctx[22](value);
    	}

    	let searchexample2_props = {
    		text: "Destroyer",
    		cb: /*getProducts*/ ctx[13]
    	};

    	if (/*query*/ ctx[1] !== void 0) {
    		searchexample2_props.query = /*query*/ ctx[1];
    	}

    	searchexample2 = new SearchExample({
    			props: searchexample2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(searchexample2, 'query', searchexample2_query_binding));

    	shoplogos = new ShopLogos({
    			props: { activeShops: /*activeShops*/ ctx[7] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Suche zum Beispiel nach\n            ");
    			create_component(searchexample0.$$.fragment);
    			t1 = text(",\n            ");
    			create_component(searchexample1.$$.fragment);
    			t2 = text(" oder\n            ");
    			create_component(searchexample2.$$.fragment);
    			t3 = text(".");
    			t4 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Unterstützte Shops";
    			t6 = space();
    			create_component(shoplogos.$$.fragment);
    			t7 = space();
    			div2 = element("div");
    			p1 = element("p");
    			t8 = text("Ein Store fehlt in der Liste? Du hast Fragen oder Anregungen? ");
    			a = element("a");
    			a.textContent = "Schreib uns über das Kontaktformular\n            ";
    			t10 = text(".");
    			t11 = space();
    			add_location(p0, file, 178, 10, 4795);
    			attr_dev(div0, "class", "col col-12");
    			add_location(div0, file, 177, 8, 4760);
    			add_location(h3, file, 186, 10, 5132);
    			attr_dev(div1, "class", "col col-12");
    			add_location(div1, file, 185, 8, 5097);
    			attr_dev(a, "href", "/contact");
    			add_location(a, file, 191, 74, 5332);
    			add_location(p1, file, 190, 10, 5254);
    			attr_dev(div2, "class", "col col-12");
    			add_location(div2, file, 189, 8, 5219);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			mount_component(searchexample0, p0, null);
    			append_dev(p0, t1);
    			mount_component(searchexample1, p0, null);
    			append_dev(p0, t2);
    			mount_component(searchexample2, p0, null);
    			append_dev(p0, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			insert_dev(target, t6, anchor);
    			mount_component(shoplogos, target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p1);
    			append_dev(p1, t8);
    			append_dev(p1, a);
    			append_dev(p1, t10);
    			append_dev(div2, t11);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const searchexample0_changes = {};

    			if (!updating_query && dirty[0] & /*query*/ 2) {
    				updating_query = true;
    				searchexample0_changes.query = /*query*/ ctx[1];
    				add_flush_callback(() => updating_query = false);
    			}

    			searchexample0.$set(searchexample0_changes);
    			const searchexample1_changes = {};

    			if (!updating_query_1 && dirty[0] & /*query*/ 2) {
    				updating_query_1 = true;
    				searchexample1_changes.query = /*query*/ ctx[1];
    				add_flush_callback(() => updating_query_1 = false);
    			}

    			searchexample1.$set(searchexample1_changes);
    			const searchexample2_changes = {};

    			if (!updating_query_2 && dirty[0] & /*query*/ 2) {
    				updating_query_2 = true;
    				searchexample2_changes.query = /*query*/ ctx[1];
    				add_flush_callback(() => updating_query_2 = false);
    			}

    			searchexample2.$set(searchexample2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchexample0.$$.fragment, local);
    			transition_in(searchexample1.$$.fragment, local);
    			transition_in(searchexample2.$$.fragment, local);
    			transition_in(shoplogos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchexample0.$$.fragment, local);
    			transition_out(searchexample1.$$.fragment, local);
    			transition_out(searchexample2.$$.fragment, local);
    			transition_out(shoplogos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(searchexample0);
    			destroy_component(searchexample1);
    			destroy_component(searchexample2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t6);
    			destroy_component(shoplogos, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(177:6) {#if defaultState || !query}",
    		ctx
    	});

    	return block;
    }

    // (174:4) {#each $products as product}
    function create_each_block_1(ctx) {
    	let productcard;
    	let current;

    	productcard = new ProductCard({
    			props: { product: /*product*/ ctx[29] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(productcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(productcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const productcard_changes = {};
    			if (dirty[0] & /*$products*/ 16) productcard_changes.product = /*product*/ ctx[29];
    			productcard.$set(productcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(productcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(productcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(productcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(174:4) {#each $products as product}",
    		ctx
    	});

    	return block;
    }

    // (167:4) {#each Array(6) as _}
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
    			attr_dev(div0, "class", "skeleton-image svelte-u5t6r2");
    			add_location(div0, file, 168, 8, 4528);
    			attr_dev(div1, "class", "skeleton-text svelte-u5t6r2");
    			add_location(div1, file, 169, 8, 4571);
    			attr_dev(div2, "class", "skeleton col col-4 col-d-6 col-t-12 svelte-u5t6r2");
    			add_location(div2, file, 167, 6, 4470);
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
    		source: "(167:4) {#each Array(6) as _}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let t0;
    	let label;
    	let t2;
    	let input;
    	let t3;
    	let button;
    	let i;
    	let t4;
    	let div0;
    	let h2;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let div1;
    	let current_block_type_index;
    	let if_block5;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*query*/ ctx[1] && !/*$loading*/ ctx[6] && create_if_block_7(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*$loading*/ ctx[6] || /*$products*/ ctx[4].length) return create_if_block_6;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*shopCount*/ ctx[0] < /*shopHandles*/ ctx[8].length) return create_if_block_4;
    		if (/*$products*/ ctx[4].length) return create_if_block_5;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block2 = current_block_type_1 && current_block_type_1(ctx);
    	let if_block3 = /*$loading*/ ctx[6] && create_if_block_3(ctx);
    	let if_block4 = /*$products*/ ctx[4].length && create_if_block_2(ctx);
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*$loading*/ ctx[6] && /*shopCount*/ ctx[0] < /*shopHandles*/ ctx[8].length && /*$products*/ ctx[4].length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block5 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			label = element("label");
    			label.textContent = "Suche nach Produkten";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			i = element("i");
    			t4 = space();
    			div0 = element("div");
    			h2 = element("h2");
    			if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			if (if_block3) if_block3.c();
    			t7 = space();
    			if (if_block4) if_block4.c();
    			t8 = space();
    			div1 = element("div");
    			if_block5.c();
    			attr_dev(label, "for", "js-product-input");
    			attr_dev(label, "class", "screen-reader-text");
    			add_location(label, file, 108, 2, 2954);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "search__text");
    			attr_dev(input, "id", "js-product-input");
    			attr_dev(input, "placeholder", "Suche eine Scheibe …");
    			add_location(input, file, 111, 2, 3050);
    			attr_dev(i, "class", "ion ion-md-search");
    			add_location(i, file, 123, 4, 3312);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "button button--primary");
    			add_location(button, file, 118, 2, 3193);
    			attr_dev(form, "class", "search__group svelte-u5t6r2");
    			add_location(form, file, 98, 0, 2715);
    			attr_dev(h2, "class", "svelte-u5t6r2");
    			add_location(h2, file, 128, 2, 3401);
    			attr_dev(div0, "class", "products-headline svelte-u5t6r2");
    			add_location(div0, file, 127, 0, 3367);
    			attr_dev(div1, "class", "row animate");
    			add_location(div1, file, 164, 0, 4335);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			if (if_block0) if_block0.m(form, null);
    			append_dev(form, t0);
    			append_dev(form, label);
    			append_dev(form, t2);
    			append_dev(form, input);
    			set_input_value(input, /*query*/ ctx[1]);
    			append_dev(form, t3);
    			append_dev(form, button);
    			append_dev(button, i);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h2);
    			if_block1.m(h2, null);
    			append_dev(h2, t5);
    			if (if_block2) if_block2.m(h2, null);
    			append_dev(div0, t6);
    			if (if_block3) if_block3.m(div0, null);
    			append_dev(div0, t7);
    			if (if_block4) if_block4.m(div0, null);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div1, anchor);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[17]),
    					listen_dev(button, "click", prevent_default(/*click_handler_1*/ ctx[18]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*query*/ ctx[1] && !/*$loading*/ ctx[6]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(form, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*query*/ 2 && input.value !== /*query*/ ctx[1]) {
    				set_input_value(input, /*query*/ ctx[1]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(h2, t5);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(h2, null);
    				}
    			}

    			if (/*$loading*/ ctx[6]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					if_block3.m(div0, t7);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*$products*/ ctx[4].length) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div0, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block5 = if_blocks[current_block_type_index];

    				if (!if_block5) {
    					if_block5 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block5.c();
    				} else {
    					if_block5.p(ctx, dirty);
    				}

    				transition_in(if_block5, 1);
    				if_block5.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block5);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block5);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div0);
    			if_block1.d();

    			if (if_block2) {
    				if_block2.d();
    			}

    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div1);
    			if_blocks[current_block_type_index].d();
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

    function sortProducts(products, key, reverse) {
    	const result = [...products].sort((a, b) => {
    		if (a[key] < b[key]) return 1;
    		if (a[key] >= b[key]) return -1;
    		return 0;
    	});

    	return reverse ? result.reverse() : result;
    }

    function instance($$self, $$props, $$invalidate) {
    	let progress;
    	let $querystring;
    	let $products;
    	let $sort;
    	let $loading;
    	validate_store(querystring, 'querystring');
    	component_subscribe($$self, querystring, $$value => $$invalidate(24, $querystring = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductSearch', slots, []);
    	const activeShops = shops.filter(shop => !shop.disabled);
    	const shopHandles = activeShops.map(shop => shop.handle);
    	const products = writable([]);
    	validate_store(products, 'products');
    	component_subscribe($$self, products, value => $$invalidate(4, $products = value));
    	const loading = writable("");
    	validate_store(loading, 'loading');
    	component_subscribe($$self, loading, value => $$invalidate(6, $loading = value));
    	let initialProducts = [];
    	let defaultState = true;
    	let shopCount = shopHandles.length;
    	const stored = localStorage.sort;
    	const sort = writable(stored || "default");
    	validate_store(sort, 'sort');
    	component_subscribe($$self, sort, value => $$invalidate(5, $sort = value));
    	sort.subscribe(value => localStorage.sort = value);
    	let query = "";

    	const clearProducts = () => {
    		$$invalidate(1, query = "");
    		push("/");
    		set_store_value(products, $products = [], $products);
    	};

    	const getProducts = async () => {
    		if (!query) {
    			push("/");
    			$$invalidate(2, defaultState = true);
    			return products.set([]);
    		}

    		window.plausible = window.plausible || function () {
    			(window.plausible.q = window.plausible.q || []).push(arguments);
    		};

    		window.plausible("product-search", { props: { query } });
    		initialProducts = [];
    		$$invalidate(2, defaultState = false);
    		push(`/?q=${encodeURIComponent(query)}`);
    		products.set([]);
    		$$invalidate(0, shopCount = 0);

    		for (const shop of shopHandles) {
    			loading.set(shop);
    			const productResponse = await fetchProducts(query, shop);
    			products.update(currentProducts => [...currentProducts, ...productResponse]);
    			$$invalidate(0, shopCount++, shopCount);
    			initialProducts.push(...productResponse);
    			handleSort();
    		}

    		loading.set("");
    	};

    	const handleSort = () => {
    		if ($sort === "price-descending") return set_store_value(products, $products = sortProducts($products, "price"), $products);
    		if ($sort === "price-ascending") return set_store_value(products, $products = sortProducts($products, "price", true), $products);
    		if ($sort === "availability") return set_store_value(products, $products = sortProducts($products, "stockStatus", true), $products);
    		return set_store_value(products, $products = initialProducts, $products);
    	};

    	onMount(async () => {
    		document.querySelector("#js-product-input").focus();
    		$$invalidate(1, query = new URLSearchParams($querystring).get("q") || "");
    		await getProducts();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductSearch> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => clearProducts();
    	const keydown_handler = () => clearProducts();

    	function input_input_handler() {
    		query = this.value;
    		$$invalidate(1, query);
    	}

    	const click_handler_1 = () => getProducts();

    	function select_change_handler() {
    		$sort = select_value(this);
    		sort.set($sort);
    	}

    	function searchexample0_query_binding(value) {
    		query = value;
    		$$invalidate(1, query);
    	}

    	function searchexample1_query_binding(value) {
    		query = value;
    		$$invalidate(1, query);
    	}

    	function searchexample2_query_binding(value) {
    		query = value;
    		$$invalidate(1, query);
    	}

    	$$self.$capture_state = () => ({
    		writable,
    		onMount,
    		fetchProducts,
    		push,
    		querystring,
    		SearchExample,
    		ShopLogos,
    		ProductCard,
    		shops,
    		activeShops,
    		shopHandles,
    		products,
    		loading,
    		initialProducts,
    		defaultState,
    		shopCount,
    		stored,
    		sort,
    		query,
    		clearProducts,
    		getProducts,
    		handleSort,
    		sortProducts,
    		progress,
    		$querystring,
    		$products,
    		$sort,
    		$loading
    	});

    	$$self.$inject_state = $$props => {
    		if ('initialProducts' in $$props) initialProducts = $$props.initialProducts;
    		if ('defaultState' in $$props) $$invalidate(2, defaultState = $$props.defaultState);
    		if ('shopCount' in $$props) $$invalidate(0, shopCount = $$props.shopCount);
    		if ('query' in $$props) $$invalidate(1, query = $$props.query);
    		if ('progress' in $$props) $$invalidate(3, progress = $$props.progress);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*query*/ 2) {
    			$$invalidate(1, query = query.toLowerCase());
    		}

    		if ($$self.$$.dirty[0] & /*shopCount*/ 1) {
    			$$invalidate(3, progress = parseInt(shopCount / shopHandles.length * 100));
    		}
    	};

    	return [
    		shopCount,
    		query,
    		defaultState,
    		progress,
    		$products,
    		$sort,
    		$loading,
    		activeShops,
    		shopHandles,
    		products,
    		loading,
    		sort,
    		clearProducts,
    		getProducts,
    		handleSort,
    		click_handler,
    		keydown_handler,
    		input_input_handler,
    		click_handler_1,
    		select_change_handler,
    		searchexample0_query_binding,
    		searchexample1_query_binding,
    		searchexample2_query_binding
    	];
    }

    class ProductSearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductSearch",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    if (document.querySelector('#product-search-app')) {
      new ProductSearch({
        target: document.querySelector('#product-search-app'),
      });
    }

})();
//# sourceMappingURL=svelte-bundle.js.map
