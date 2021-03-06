const React = require('react');
const jQueryTerminal = require('jquery.terminal');
const axios = require('axios');

class Terminal extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			command: null,
      prompt: '/picoShell >> ',
      containerName: this.props.containerName, // change this to refer to user name when login is done
      curCommand: null,
      curDir: '/',
      username: this.props.username,
      response: '',
      hidden: false
    }
    this.socket = io();
    this.renderTerminal();
    this.recievedTermInput = this.recievedTermInput.bind(this);
    this.recievedTermResponse = this.recievedTermResponse.bind(this);
    this.recievedTermCD = this.recievedTermCD.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    console.log('TERM GOT PROPS', nextProps);
    const context = this;
    this.socket.off('/TERM/' + this.state.containerName);
    this.socket.off('/TERM/RES/' + this.state.containerName);
    this.socket.off('/TERM/CD/' + this.state.containerName);
    this.setState({
      containerName: nextProps.containerName,
      hidden: nextProps.hidden
    })
    this.terminal.clear();
    if(nextProps.containerName !== this.props.containerName) this.terminal.echo('Welcome to ' + nextProps.containerName + '\'s computer.');
    this.socket.on('/TERM/' + nextProps.containerName, function(code) {
      context.recievedTermInput(code);
    });

    this.socket.on('/TERM/RES/' + nextProps.containerName, function(code) {
      console.log('in componetn will receive props received term response');
      context.recievedTermResponse(code);
    });

    this.socket.on('/TERM/CD/' + nextProps.containerName, function(path) {
      context.recievedTermCD(path);
    });
    this.renderTerminal();
  }

  recievedTermInput(code) {

    if (code) {
      if(code.username !== this.state.username) {
        this.terminal.set_command(code.cmd, false);
        this.setState({
          curCommand: code.cmd
        });
      }
    }
  }

  recievedTermResponse(code) {
    //console.log('TR', code);
    if(code.username !== this.state.username) {
      console.log('in term response', code);
      this.terminal.echo(this.terminal.get_prompt() + code.cmd);
      this.terminal.echo(code.res);
      this.terminal.set_command('');
      this.setState({
        curCommand: ''
      });
    }
  }

  recievedTermCD(path) {
    if(path.username !== this.state.username) {
      console.log('REMOTE DIR', path.dir);
      this.setState({
        curDir: path.dir,
        prompt: path.dir + ' >> '
      });
      this.terminal.set_prompt(path.dir + ' >> ');
    }
  }

  componentWillMount() {
    const context = this;

    //The 1 will be replaced by container/user ID when we have sessions
    this.socket.on('/TERM/' + this.props.containerName, function(code) {
      context.recievedTermInput();
    });

    this.socket.on('/TERM/RES/' + this.props.containerName, function(code) {
      console.log('in component will mount received term response');
      context.recievedTermResponse();
    });

    this.socket.on('/TERM/CD/' + this.props.containerName, function(path) {

      context.recievedTermCD();
    });
  }

  renderTerminal() {
    var context = this;
    var prompt = this.state.prompt;
    var containerName = this.state.containerName;

    $(function($, undefined) {
      $('#terminal').terminal(function(command, term) {
        if (command !== '') {
          console.log('IN COMMMAND WOOWOWOWOOW');
          context.socket.emit('/ANALYZE/', {cmd: command, containerName: context.state.containerName}, function(res) {
            if(typeof res === 'object') {
              if(res.fileOpen) {
                console.log(res);
                context.socket.emit('/TE/', {filePath: res.filePath, fileOpen: res.fileOpen, fileName: res.fileName, code: res.termResponse, username: context.state.username, containerName: context.state.containerName});
                context.socket.emit('/TERM/RES/', {cmd: command, res: '', username: context.state.username, containerName: context.state.containerName});
              } else if(res.pwd) {
                console.log('CD', res.pwd);
                if (res.pwd[res.pwd.length - 1] === '\n') res.pwd = res.pwd.slice(0, res.pwd.length - 1);
                context.setState({
                  curDir: res.pwd,
                  prompt: res.pwd + ' >> '
                });
                context.terminal.set_prompt(res.pwd + ' >> ');
                console.log('PROMPT', context.terminal.get_prompt());
                context.socket.emit('/TERM/CD/', {dir: res.pwd, username: context.state.username, containerName: context.state.containerName});
                context.socket.emit('/TERM/RES/', {cmd: command, res: res.res, username: context.state.username, containerName: context.state.containerName});
              } else {
                term.echo(String(JSON.stringify(res)));
                context.socket.emit('/TERM/RES/', {cmd: command, res: JSON.stringify(res), username: context.state.username, containerName: context.state.containerName});
              }
              context.terminal.set_command('', false);
              context.setState({
                curCommand: ''
              });
            } else {
              term.echo(String(res));
              console.log('SENDING AN ECHO', command, context.state.username, context.state.containerName);
              context.socket.emit('/TERM/RES/', {cmd: command, res: res, username: context.state.username, containerName: context.state.containerName});
              context.terminal.set_command('', false);
              context.setState({
                curCommand: ''
              });
              console.log('reset currentCommand');  
            }
          });
          

          // axios.post('/docker/cmd', { cmd: command, containerName: context.state.containerName })
          // .then(function(res) {
          //   if(typeof res.data === 'object') {
          //     if(res.data.fileOpen) {
          //       console.log(res.data);
          //       context.socket.emit('/TE/', {filePath: res.data.filePath, fileOpen: res.data.fileOpen, fileName: res.data.fileName, code: res.data.termResponse, username: context.state.username, containerName: context.state.containerName});
          //       context.socket.emit('/TERM/RES/', {cmd: command, res: '', username: context.state.username, containerName: context.state.containerName});
          //     } else if(res.data.pwd) {
          //       console.log('CD', res.data.pwd);
          //       if (res.data.pwd[res.data.pwd.length - 1] === '\n') res.data.pwd = res.data.pwd.slice(0, res.data.pwd.length - 1);
          //       context.setState({
          //         curDir: res.data.pwd,
          //         prompt: res.data.pwd + ' >> '
          //       });
          //       context.terminal.set_prompt(res.data.pwd + ' >> ');
          //       console.log('PROMPT', context.terminal.get_prompt());
          //       context.socket.emit('/TERM/CD/', {dir: res.data.pwd, username: context.state.username, containerName: context.state.containerName});
          //       context.socket.emit('/TERM/RES/', {cmd: command, res: res.data.res, username: context.state.username, containerName: context.state.containerName});
          //     } else {
          //       term.echo(String(JSON.stringify(res.data)));
          //       context.socket.emit('/TERM/RES/', {cmd: command, res: JSON.stringify(res.data), username: context.state.username, containerName: context.state.containerName});
          //     }
          //     context.terminal.set_command('', false);
          //     context.setState({
          //       curCommand: ''
          //     });
          //   } else {
          //     term.echo(String(res.data));
          //     context.socket.emit('/TERM/RES/', {cmd: command, res: res.data, username: context.state.username, containerName: context.state.containerName});
          //     context.terminal.set_command('', false);
          //     context.setState({
          //       curCommand: ''
          //     });
          //   }
          // })
          // .catch(function(err) {
          //   console.error(err);
          //   term.echo(String(err));
          //   context.socket.emit('/TERM/RES/', {cmd: command, res: err, username: context.state.username, containerName: context.state.containerName});
          // });

              // var result = window.eval(command);
            }
          }, {
            greetings: 'Welcome to ' + context.state.containerName + '\'s computer.',
            name: '',
            prompt: prompt,
            tabcompletion: true,
            completion: function(terminal, command, callback) {
              // axios.post('/docker/cmd', { cmd: 'ls', containerName: context.state.containerName })
              // .then(function(res) {
              //   const possibilities = (res.data.split('\n'));
              //   callback(possibilities);
              // });
            },
            onInit: function(term) {
              context.terminal = term;
              var command = 'cd /picoShell';
              context.socket.emit('/ANALYZE/', {cmd: command, containerName: containerName});
            // axios.post('/docker/cmd', { cmd: command, containerName: containerName })
            // .then(function(res) {
            //   term.echo(String(res.data.res));
            // })
            // .catch(function(err) {
            //   console.error(err);
            //   term.echo(String(err));
            // });
          },
          onCommandChange: function(command, term) {
            if(command !== context.state.curCommand) {
              context.socket.emit('/TERM/', {cmd: command, username: context.state.username, containerName: context.state.containerName});
              context.setState({
                curCommand: command
              });
            }
          },
          keydown: function(event, term) {
            if(event.key === 'Backspace') {
              //the keydown event fires as soon as the key is pressed, but before a character is removed
              //A timeout of 10ms allows term.get_command() to reflecct the actual new command after backspace
              //is pressed. If this is too janky, we can remove this.
              setTimeout(function() {
                context.socket.emit('/TERM/', {cmd: term.get_command(), username: context.state.username, containerName: context.state.containerName});
              }, 10);
            }
          },
        });
});
}

render() {
  if(!this.state.hidden) {
    return (
      <div>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/jquery.terminal/0.11.13/css/jquery.terminal.min.css" rel="stylesheet"></link>
      <div id="terminal"></div><br/>
      </div>
      );
  } else {
    return (
      <div>
      </div>
      );
  }
}
}

module.exports = Terminal;