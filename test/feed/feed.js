const {config} = require('../../config')
const fs = require('fs')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const {deleteFile} = require('../../utils')
chai.should()
chai.use(chaiHttp)

const Post = require('../../models/post')
const User = require('../../models/user')

module.exports = () => describe('feed tests', () => {
	let userData = null
	let postId = null
	let imageUrl = null
	
	before(done => {
		// authentication
		chai
			.request(app)
			.post('/api/auth/login')
			.set('Content-Type', 'application/json')
			.send({
				email: config.tests.userEmail,
				password: config.tests.userPassForTest
			})
			.then(res => {
				// set global user
				userData = res.body

				// clear image folder
				fs.readdir(`${__dirname}/../../images/posts`, (err, files) => {
					if (files.length) {
						files.forEach(name => {
							deleteFile((`${__dirname}/../../images/posts/${name}`))
						})
					}
				})

				// clear users posts list
				return User
					.findOne({_id: res.body.userId})
					.then(user => {
						user.posts = []
						user.save()
						return Promise.resolve()
					})
			})
			.then(() => {
				Post.deleteMany({}, err => done())
			})
	})

	it('GET it should GET 0 feeds', done => {
		chai
			.request(app)
			.get('/api/feedRead/posts')
			.end((err, res) => {
				res.should.have.status(200)
				res.body.should.be.a('object')
				res.body.posts.should.be.a('array')
				res.body.posts.length.should.be.eql(0)
				res.body.totalItems.should.be.eql(0)
				done()
			})
	})

	it('POST create post if [auth user]', done => {
		const feed = {
			title: 'Название объявления для теста 01',
			content: 'Описание объявления для теста. Описание объявления для теста. Описание объявления для теста.',
			animalType: 'reptile',
			postType: 'buy',
			city: 'Москва',
			phoneNumber: '+79856677722',
			price: 5000,
			address: 'ул Красного Маяка, дом 17 корпус 2'
		}

		chai
			.request(app)
			.post('/api/feed/post')
			.set('Authorization', `Bearer ${userData.token}`)
			.type('form')
			.field(feed)
			.attach('file', fs.readFileSync(`${__dirname}/testImg1.jpg`), 'testImg1.jpg')
			.attach('file', fs.readFileSync(`${__dirname}/testImg2.jpg`), 'testImg2.jpg')
			.end((err, result) => {
				result.should.have.status(200)
				done()
		})
	})

	it('POST not create post if [unauth user]', done => {
		const feed = {
			title: 'Название объявления для теста 01',
			content: 'Описание объявления для теста. Описание объявления для теста. Описание объявления для теста.',
			animalType: 'reptile',
			postType: 'buy',
			city: 'Москва',
			phoneNumber: '+79856677722',
			price: 5000,
			address: 'ул Красного Маяка, дом 17 корпус 2'
		}

		chai
			.request(app)
			.post('/api/feed/post')
			.type('form')
			.field(feed)
			.attach('file', fs.readFileSync(`${__dirname}/testImg1.jpg`), 'testImg1.jpg')
			.attach('file', fs.readFileSync(`${__dirname}/testImg2.jpg`), 'testImg2.jpg')
			.end((err, result) => {
				result.should.have.status(401)
				done()
			})
	})

	describe('PUT /api/feed/post/:id', () => {
		const newParams = {
			title: 'Обновленное названание объявления',
			content: 'Обновленное описание объявления',
			creatorName: 'Николай Парус',
			animalType: 'dog',
			postType: 'missing',
			city: 'Воронеж',
			phoneNumber: '+79878987765',
			price: 2500,
			address: 'ул Красного Маяка, дом 19 корпус 2'
		}

		before(done => {
			const getPostId = async () => {
				return await User
					.findOne({_id: userData.userId})
					.then(user => {
						postId = user.posts[0]
						return Promise.resolve()
					})
			}

			const getImageUrl = async () => {
				return Post
					.findOne({_id: postId})
					.then(post => {
						imageUrl = post.imageUrl[0]
						return Promise.resolve()
					})
			}

			const main = async () => {
				try {
					await getPostId()
					await getImageUrl()
					done()
				} catch (err) {
					console.log({err})
				}
			}
	
			main()
		})

		it('update post if [auth user]', done => {
			chai
				.request(app)
				.put(`/api/feed/post/${postId}`)
				.set('Authorization', `Bearer ${userData.token}`)
				.set('Content-Type', 'application/json')
				.send(newParams)
				.end((err, res) => {
					res.should.have.status(201)
					done()
				})
		})

		it('delete image if [auth user]', done => {
			chai
				.request(app)
				.delete(`/api/feed/deletePostImage/${postId}`)
				.send({
					imageUrl: imageUrl
				})
				.set('Authorization', `Bearer ${userData.token}`)
				.end((err, res) => {
					res.should.have.status(200)
					done()
				})
		})

		it('not delete image if [unauth user]', done => {
			chai
				.request(app)
				.delete(`/api/feed/deletePostImage/${postId}`)
				.send({
					imageUrl: imageUrl
				})
				.end((err, res) => {
					res.should.have.status(401)
					done()
				})
		})

		it('not update post if [unauth user]', done => {
			chai
				.request(app)
				.put(`/api/feed/post/${postId}`)
				.set('Content-Type', 'application/json')
				.send(newParams)
				.end((err, res) => {
					res.should.have.status(401)
					done()
				})
		})

		it('not found post [auth user]', done => {
			chai
				.request(app)
				.get(`/api/feedRead/post/6ca0d2844931506dbfa87e4b`)
				.set('Authorization', `Bearer ${userData.token}`)
				.send(newParams)
				.end((err, res) => {
					res.should.have.status(500)
					done()
				})
		})

		it('not found post [unauth user]', done => {
			chai
				.request(app)
				.get(`/api/feedRead/post/6ca0d2844931506dbfa87e4b`)
				.send(newParams)
				.end((err, res) => {
					res.should.have.status(500)
					done()
				})
		})
	})

	it('it should GET feeds length > 0', done => {
		chai
			.request(app)
			.get('/api/feedRead/posts')
			.end((err, res) => {
				res.should.have.status(200)
				res.body.should.be.a('object')
				res.body.posts.should.be.a('array')
				res.body.posts.length.should.be.eql(1)
				res.body.totalItems.should.be.eql(1)
				done()
			})
	})

	describe('OPEN post', () => {
		it('GET open post', done => {
			chai
				.request(app)
				.get(`/api/feedRead/post/${postId}`)
				.end((err, res) => {
					let {
						imageUrl,
						active,
						moderate,
						price,
						_id,
						title,
						content,
						creatorId,
						creatorName,
						animalType,
						postType,
						city,
						phoneNumber,
						stopDate,
						createdAt
					} = res.body

					res.should.have.status(200)
					
					imageUrl.should.be.a('array')
					chai.assert.isNumber(price)
					chai.assert.isBoolean(active)
					chai.assert.isString(moderate)
					chai.assert.isString(_id)
					chai.assert.isString(title)
					chai.assert.isString(content,)
					chai.assert.isString(creatorId,)
					chai.assert.isString(creatorName,)
					chai.assert.isString(animalType,)
					chai.assert.isString(postType)
					chai.assert.isString(city)
					chai.assert.isString(phoneNumber)
					chai.assert.isString(stopDate)
					chai.assert.isString(createdAt)
					done()
				})
		})
	})

	describe('PUT modeation post [user not moderator]', () => {
		it('not allow moderation [unauth user]', done => {
			chai
				.request(app)
				.put('/api/feed/moderatePost')
				.send({
					postId,
					status: 'resolve'
				})
				.end((err, res) => {
					res.should.have.status(401)
					done()
				})
		})

		it('not allow moderation [auth user]', done => {
			chai
				.request(app)
				.put('/api/feed/moderatePost')
				.set('Authorization', `Bearer ${userData.token}`)
				.send({
					postId,
					status: 'resolve'
				})
				.end((err, res) => {
					res.should.have.status(500)
					done()
				})
		})
	})

	describe('PUT modeation post [user moderator]', () => {
		before(done => {
			User
				.findOne({_id: userData.userId})
				.then(user => {
					user.status = 'moderator'
					return user.save()
				})
				.then(() => done())
		})

		it('set resolve moderation [auth moderator]', done => {
			chai
				.request(app)
				.put('/api/feed/moderatePost')
				.set('Authorization', `Bearer ${userData.token}`)
				.send({
					postId,
					status: 'resolve'
				})
				.end((err, res) => {
					res.should.have.status(200)
					done()
				})
		})
	})

	describe('DELETE /api/post/:id', () => {
		it('not delete post if [unauth user]', done => {
			chai
				.request(app)
				.delete(`/api/feed/post/${postId}`)
				.set('Content-Type', 'application/json')
				.end((err, res) => {
					res.should.have.status(401)
					done()
				})
		})

		it('delete post if [auth user]', done => {
			chai
				.request(app)
				.delete(`/api/feed/post/${postId}`)
				.set('Authorization', `Bearer ${userData.token}`)
				.set('Content-Type', 'application/json')
				.end((err, res) => {
					res.should.have.status(200)
					done()
				})
		})
	})
})