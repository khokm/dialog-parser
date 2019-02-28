const {formatMsg, fakeParam} = require('./helpers');
const {handlers} = require('./handlers');

class DialogParser {
	constructor(messages, customHandlers) {
		this.formatMsg = (code, args) => formatMsg(messages, code, args);
		this.fakeParam = () => fakeParam(messages);

		this.handlers = {};

		Object.entries(customHandlers || handlers).forEach(([key, method]) => {
			 this.handlers[key] = method.bind(this);
		});
	}

	async handleNextValue(parameter, ui) {

		const type = parameter.type;
		const handler = this.handlers[type];

		if(!handler)
			throw `Parameter "${parameter.name}": no handler for type "${type}"`;

		while(true) {
			try{
				let value = await handler(parameter, ui);

				if(value != undefined)
					return value;
			}
			catch (e) {
				if(Array.isArray(e))
					ui.error(this.formatMsg(e[0], e[1]));
				else
					throw e;
			}
		}
	}

	async startDialog(parameters, ui) {
		let result = {};
		let history = [];

		for(let i = 0; i < parameters.length + 1; i++) {

			const parameter = i == parameters.length ? this.fakeParam() : parameters[i];

			if(parameter.name)
				delete result[parameter.name];

			if(parameter.conditions && !parameter.conditions.some(
				cond => result[cond.name] == cond.value)) {
				continue;
			}

			try{
				let value = await this.handleNextValue(parameter, ui);

				if(parameter.name)
					result[parameter.name] = value;

			}
			catch(e) {
				if(e == 'bot_reset')
					return undefined;

				if(e == 'bot_edit') {
					i = (history.pop() || 0) - 1;
					continue;
				}

				throw e;
			}

			history.push(i);
		}

		return result;
	}
}

module.exports = DialogParser;