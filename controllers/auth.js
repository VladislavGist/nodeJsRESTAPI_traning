const {validationResult} = require('express-validator/check')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const sgTransport = require('nodemailer-sendgrid-transport');
const {error, multipleMessageError} = require('../utils')
const {config} = require('../config')
const User = require('../models/user')

const ENVAIRONMENT = process.env.NODE_ENV

const transpotrer = nodemailer.createTransport(sgTransport({
	auth: {
		api_key: config.mail.apiKey
	}
}))

exports.signup = (req, res, next) => {
	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		const errorsToString = errors.array()

		error({
			statusCode: 422,
			err: {message: multipleMessageError(errorsToString)}
		})
	}

	const {
		email,
		password,
		name
	} = req.body

	User
		.findOne({email})
		.then(user => {
			if (user) {
				return Promise.reject('Пользователь с таким email уже существует')
			}
		})
		.then(() => bcrypt.hash(password, 12))
		.then(hashedPassword => {
			const user = new User({
				email,
				password: hashedPassword,
				name
			})
			return user.save()
		})
		.then(result =>
			res
				.status(201)
				.json({
					message: 'Вы успешно зарегистрированы',
					userId: result._id
				})
		)
		.catch(err => error({err: {message: err}, next}))
}

exports.login = (req, res, next) => {
	const {
		email,
		password
	} = req.body

	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		const errorsToString = errors.array()

		error({
			statusCode: 422,
			err: {message: multipleMessageError(errorsToString)}
		})
	}

	let loggedUser;

	User
		.findOne({email})
		.then(user => {
			if (!user) {
				res
					.status(200)
					.json({
						message: 'Пользователь с таким email не найден'
					})
			} else {
				loggedUser = user
				return bcrypt.compare(password, user.password)
			}

		})
		.then(isEqual => {
			if (!isEqual) {
				res
					.status(200)
					.json({
						message: 'Пароль неверен'
					})
			} else {
				const token = jwt.sign({
					email: loggedUser.email,
					userId: loggedUser._id.toString()
				}, config.auth.secretKey,
				{
					expiresIn: '1h'
				})
				res
					.status(200)
					.json({
						token,
						userId: loggedUser._id.toString()
					})
			}
		})
		.catch(err => error({err: {message: err}, next}))
}

exports.resetPassword = (req, res, next) => {
	const errors = validationResult(req)
	const {email} = req.body

	if (!errors.isEmpty()) {
		const errorsToString = errors.array()

		error({
			statusCode: 422,
			err: {message: multipleMessageError(errorsToString)}
		})
	}

	crypto.randomBytes(32, (err, buffer) => {
		if (err) error({err})

		const token = buffer.toString('hex')
		const {
			devPort,
			prodPort
		} = config

		User
			.findOne({email})
			.then(user => {
				if (!user) return Promise.reject('Пользователь с таким email не найден')

				user.resetToken = token
				user.resetTokenExpiration = Date.now() + 3600000
				return user.save()
			})
			.then(() => {
				return transpotrer.sendMail({
					to: email,
					from: 'paypets.org',
					subject: 'Сброс пароля в PayPets',
					html: `
						<h1>Сброс пароля на сайте PayPets</h1>
						<p>Для сброса пароля перейдите по <a href="http://localhost:${ENVAIRONMENT === 'develop' ? devPort : prodPort}/#/changePassword/${token}">ссылке</a></p>
					`
				})
			})
			.then(() => {
				res.status(200).json({
					message: 'На Вашу почту было отправлено письмо для восстановления пароля. Возможно оно попало в папку spam.'
				})
			})
			.catch(err => error({err, next}))
	})
}

exports.addNewPassword = (req, res, next) => {
	const errors = validationResult(req)
	const {token, password} = req.body
	let resetUser;

	if (!errors.isEmpty()) {
		const errorsToString = errors.array()

		error({
			statusCode: 422,
			err: {message: multipleMessageError(errorsToString)}
		})
	}

	User
		.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
		.then(user => {
			if (!user) return Promise.reject('Пользователь не найден')

			resetUser = user
			return bcrypt.hash(password, 12)
		})
		.then(hashedPassword => {
			resetUser.password = hashedPassword
			resetUser.resetToken = undefined
			resetUser.resetTokenExpiration = undefined
			return resetUser.save()
		})
		.then(() => res.status(200).json({message: 'Пароль изменен'}))
		.catch(err => error({err, next}))
}

exports.changeUserData = (req, res, next) => {
	
}

exports.deleteUser = (req, res, next) => {
	
}