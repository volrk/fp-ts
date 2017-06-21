import { Monoid } from './Monoid'
import { Monad, FantasyMonad } from './Monad'
import { Lazy, toString } from './function'

declare module './HKT' {
  interface HKT<A> {
    Task: Task<A>
  }
}

export const URI = 'Task'

export type URI = typeof URI

export class Task<A> implements FantasyMonad<URI, A> {
  static of = of
  static empty = empty
  readonly _A: A
  readonly _URI: URI
  constructor(public readonly value: Lazy<Promise<A>>) {}
  run(): Promise<A> {
    return this.value()
  }
  map<B>(f: (a: A) => B): Task<B> {
    return new Task(() => this.run().then(f))
  }
  of<B>(b: B): Task<B> {
    return of(b)
  }
  ap<B>(fab: Task<(a: A) => B>): Task<B> {
    return new Task(() => Promise.all([fab.run(), this.run()]).then(([f, a]) => f(a)))
  }
  ap_<B, C>(this: Task<(a: B) => C>, fb: Task<B>): Task<C> {
    return fb.ap(this)
  }
  chain<B>(f: (a: A) => Task<B>): Task<B> {
    return new Task(() => this.run().then(a => f(a).run()))
  }
  concat(fy: Task<A>): Task<A> {
    return new Task<A>(() => {
      return new Promise<A>(r => {
        let running = true
        const resolve = (a: A) => {
          if (running) {
            running = false
            r(a)
          }
        }
        this.run().then(resolve)
        fy.run().then(resolve)
      })
    })
  }
  inspect() {
    return this.toString()
  }
  toString() {
    return `new Task(${toString(this.value)})`
  }
}

export function map<A, B>(f: (a: A) => B, fa: Task<A>): Task<B> {
  return fa.map(f)
}

export function of<A>(a: A): Task<A> {
  return new Task(() => Promise.resolve(a))
}

export function ap<A, B>(fab: Task<(a: A) => B>, fa: Task<A>): Task<B> {
  return fa.ap(fab)
}

export function chain<A, B>(f: (a: A) => Task<B>, fa: Task<A>): Task<B> {
  return fa.chain(f)
}

export function concat<A>(fx: Task<A>, fy: Task<A>): Task<A> {
  return fx.concat(fy)
}

const neverPromise = new Promise(resolve => undefined)
const neverLazyPromise = () => neverPromise
const never = new Task(neverLazyPromise)

/** returns a task that never completes */
export function empty<A>(): Task<A> {
  return never as Task<A>
}

const proof: Monad<URI> & Monoid<Task<any>> = { URI, map, of, ap, chain, concat, empty }
// tslint:disable-next-line no-unused-expression
proof
