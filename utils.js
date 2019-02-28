const fs = require('fs')

const error = ({
	statusCode,
	err,
	next
}) => {
	let mutateErrorMessage = typeof err === 'object' ? err.message : err
	const error = new Error(mutateErrorMessage)
	error.statusCode = statusCode || 500
	
	if (next) next(error)
	else throw error
}

const multipleMessageError = arrayErrors => {
	let message = ''
	
	arrayErrors.forEach((obj, idx) => {
		message += `${obj.msg}${idx + 1 === arrayErrors.length ? '' : ', '}`
	})

	return message
}

const deleteFile = filePath => {
	fs.unlink(filePath, err => {
		if (err) {
			error({err})
		}
	})
}

const changeLog = message => {
	const text = `<==== ${message} ====>`

	console.log(text)
}

exports.error = error
exports.changeLog = changeLog
exports.multipleMessageError = multipleMessageError
exports.deleteFile = deleteFile