/*!
 * koa-better-router <https://github.com/tunnckoCore/koa-better-router>
 *
 * Copyright (c) 2016 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

/* jshint asi:true */

'use strict'

var request = require('supertest')
let test = require('mukla')
let Koa = require('koa')
var isGen = require('is-es6-generator-function')
let Router = require('./index')
let router = Router()
let app = new Koa()

test('should expose constructor', function (done) {
  test.strictEqual(typeof Router, 'function')
  test.strictEqual(typeof Router(), 'object')
  test.strictEqual(typeof (new Router()), 'object')
  test.strictEqual(typeof router, 'object')
  done()
})

test('should have `.addRoute`, `.middleware` and `legacyMiddlewares` methods', function (done) {
  test.strictEqual(typeof router.addRoute, 'function')
  test.strictEqual(typeof router.middleware, 'function')
  test.strictEqual(typeof router.loadMethods, 'function')
  test.strictEqual(typeof router.legacyMiddleware, 'function')
  done()
})

test('should not have the HTTP verbs as methods if not `.loadMethods` called', function (done) {
  test.strictEqual(router.get, undefined)
  test.strictEqual(router.put, undefined)
  test.strictEqual(router.del, undefined)
  test.strictEqual(router.post, undefined)
  test.strictEqual(router.patch, undefined)
  test.strictEqual(router.delete, undefined)
  done()
})

test('should have HTTP verbs as methods when `.loadMethods` is called', function (done) {
  let api = Router({ prefix: '/api' })
  api.loadMethods()
  test.strictEqual(typeof api.put, 'function')
  test.strictEqual(typeof api.get, 'function')
  test.strictEqual(typeof api.post, 'function')
  test.strictEqual(typeof api.patch, 'function')
  done()
})

test('should have `.route` method (path-match matcher) on instance', function (done) {
  test.strictEqual(typeof router.route, 'function')
  done()
})

test('should have empty `.routes` array on initialization', function (done) {
  test.strictEqual(Array.isArray(router.routes), true)
  test.strictEqual(router.routes.length, 0)
  done()
})

test('should `.addRoute` throw TypeError if `method` a string', function (done) {
  function fixture () {
    router.addRoute(123)
  }
  test.throws(fixture, TypeError)
  test.throws(fixture, /expect `method` to be a string/)
  done()
})

test('should `.addRoute` throw TypeError pathname not a string, array or function', function (done) {
  function fixture () {
    router.addRoute('GET', 123)
  }
  test.throws(fixture, TypeError)
  test.throws(fixture, /expect `pathname` be string, array or function/)
  done()
})

test('should `.addRoute` be able to accept single function as `pathname`', function (done) {
  let apiRouter = Router()
  apiRouter.addRoute('GET /users', function (ctx, next) {})
  done()
})

test('should `.addRoute` accept `pathname` to be array of middlewares', function (done) {
  let apiRouter = Router()
  apiRouter.addRoute('GET /companies', [
    function (ctx, next) {
      ctx.body = 'Hello world!'
      return next()
    },
    function * (next) {
      this.body = `${this.body} Try /companies and /api/companies`
      yield next
    }
  ])

  app.use(apiRouter.middleware({ prefix: '/api' }))
  request(app.callback()).get('/api/companies')
    .expect(200, /Hello world! Try/)
    .expect(/companies and/)
    .end(done)
})

test('should `.middleware` return generator function when opts.legacy: true', function (done) {
  let router = Router()
  let ret = router.middleware({ legacy: true })
  test.strictEqual(isGen(ret), true)
  done()
})

test('should `.middleware` trigger route if request method not match', function (done) {
  let cnt = 111
  let api = new Router({
    prefix: '/api'
  })
  api.loadMethods().post('/comment', function * (next) {
    cnt++
    yield next
  })
  app.use(api.middleware())

  request(app.callback()).get('/comment').expect(404, function (err) {
    test.ifError(err)
    test.strictEqual(cnt, 111)
    done()
  })
})

test('should call next middleware correctly', function (done) {
  let called = 0
  let koa = new Koa()
  router.loadMethods().get('/foobaz/:id', function * (next) {
    this.body = `Foo ${this.params.id} Baz`
    yield next
  })
  koa.use(router.middleware())
  koa.use(function (ctx, next) {
    called++
    return next()
  })

  request(koa.callback()).get('/foobaz/123').expect(/Foo 123 Baz/)
    .expect(200, function (err) {
      test.ifError(err)
      test.strictEqual(called, 1)
      done()
    })
})
