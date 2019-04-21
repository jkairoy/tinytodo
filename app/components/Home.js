import '../assets/css/App.css'
import React, { Component } from 'react'
import ContentEditable from 'react-contenteditable'
import plus from "../assets/images/add.svg"
import trash from "../assets/images/trash.svg"
import storage from "electron-storage"
var moment = require('moment');
const path = require('path');

class Home extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      todo: [],
      done: [],
    }
    this.today = new Date
    this.dates = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    this.dataStoragePath = path.join(__dirname,"todoStorage.json")
    this.deleteDoneNotes = this.deleteDoneNotes.bind(this)
    this.updateStorage = this.updateStorage.bind(this)
  }

  updateStorage() {
    storage.set(this.dataStoragePath, this.state, (err) => {
      if (err) {
        console.error(err)
      }
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // TODO: Inefficient? cause every state update triggers saving state
    this.updateStorage()
  }

  componentDidMount() {
    console.log("mounted")
    storage.get(this.dataStoragePath, (err, data) => {
      let todorehydrate = data.todo.map((item, j) => {
        return({note: item.note,
                date: (item.date == null) ? null : new Date(item.date),
                priority: item.priority})
      })
      let donerehydrate = data.done.map((item, j) => {
        return({note: item.note,
                date: (item.date == null) ? null : new Date(item.date),
                priority: item.priority})
      })
      this.setState({todo: todorehydrate, done: donerehydrate}, () => {
        this.formatall()
      })
    });
  }

  undone(i) {
    let todo = this.state.todo
    let done = []
    this.state.done.map((item, j) => {
      if (j === i) {todo.unshift(item)}
      else {done.push(item)}
    })
    this.setState({done: done, todo: todo})
  }

  striphtml(string) {
    let re = /<[^>]*>/g
    let retstring = string.replace(re, "");
    return retstring
  }

  parseday(string) {
    if (string.toLowerCase() === 'today') {return(moment(this.today))}
    else if (string.toLowerCase() === 'tomorrow') {return(moment(this.today).add(1, 'd'))}
    else {return (moment(string, 'dddd', true))}
  }

  whendate(day, next) {
    let nextconst = 0
    if(next){nextconst = 7}
    let input = day.day()
    let today = moment(this.today).day()
    if (today <= input) {return (input - today + nextconst)}
    else {return (input + 7 - today + nextconst)}
  }

  parsetime(string) {
    if (string === 'evening') return (moment('17:00', 'hh:mm'))
    if (string === 'morning') return (moment('07:00', 'hh:mm'))
    if (string === 'noon') return (moment('12:00', 'hh:mm'))
    if (string === 'afternoon') return (moment('14:00', 'hh:mm'))
    if (string === 'night') return (moment('20:00', 'hh:mm'))
    if (string === 'midnight') return (moment('23:59', 'hh:mm'))
    else return (null)
  }

  getCaretPosition(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
      sel = win.getSelection();
      if (sel.rangeCount > 0) {
        var range = win.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
      }
    } else if ((sel = doc.selection) && sel.type != "Control") {
      var textRange = sel.createRange();
      var preCaretTextRange = doc.body.createTextRange();
      preCaretTextRange.moveToElementText(element);
      preCaretTextRange.setEndPoint("EndToEnd", textRange);
      caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
  }

  richtexify(string) {
    let next = false
    let dayre = /&nbsp;| |[^ &]+|&/g
    let priorityre = /^#[0-9]+$/g
    let stringclean = this.striphtml(string)
    let words = stringclean.match(dayre)
    let retstring = ""
    let dateindex = 7
    let targetday = moment(this.today)
    let time = null
    let priority = -1
    if (words !== null) {
      for (let i = 0; i < words.length; i++) {
        let dayparse = this.parseday(words[i])
        let timeparse = moment(words[i], ['h:mm', 'hh:mm', 'h:mma', 'hh:mma', 'hha', 'ha'], true)
        let timeparsealt = this.parsetime(words[i].toLowerCase())
        if (dayparse.isValid()) {
          dateindex = Math.min(dateindex, this.whendate(dayparse, next))
          retstring = retstring.concat("<b>" + words[i] + "</b>")
          next = false
        } else if (timeparse.isValid()) {
          if (time === null) {time = timeparse}
          else {time = moment.min(timeparse, time)}
          retstring = retstring.concat("<b class='time'>" + words[i] + "</b>")
        } else if (words[i].toLowerCase() === 'next' &&
                   words[i+2] !== undefined &&
                   this.parseday(words[i+2]).isValid()){
            next = true
            retstring = retstring.concat("<b>" + words[i] + "</b>")
        } else if (timeparsealt !== null) {
          if (time === null) {time = timeparsealt}
          else {time = moment.min(timeparsealt, time)}
          retstring = retstring.concat("<b class='time'>" + words[i] + "</b>")
        } else if (priorityre.test(words[i])) {
          console.log(words[i])
          priority = words[i].match(/[0-9]+/g)[0]
          retstring = retstring.concat("<b class='priority'>" + words[i] + "</b>")
        } else {
          retstring = retstring.concat(words[i])
        }
      }
      if (dateindex === 7) {
        if (time !== null) {
          targetday = targetday.hour(time.get('hour'))
          targetday = targetday.minute(time.get('minute'))
          return ({note: retstring, date: targetday.toDate(), priority: priority})
        } else {
          return ({note: retstring, date: null, priority: priority})
        }
      }
      else {
        targetday.add(dateindex, 'd')
        if (time !== null) {
          targetday = targetday.hour(time.get('hour'))
          targetday = targetday.minute(time.get('minute'))
        }
        return ({note: retstring, date: targetday.toDate(), priority: priority})
      }
    }
    return ({note: retstring, date: null, priority: priority})
  }

  format(list, index) {
    if (list === "todo") {
      this.setState({todo: this.state.todo.map((item, j) => {
        if (j === index) {return(this.richtexify(item.note))}
        else {return(item)}
      })}, () => {this.sort()})
    } else {
      this.setState({done: this.state.done.map((item, j) => {
        if (j === index) {return(this.richtexify(item.note))}
        else {return(item)}
      })}, () => {this.sort()})
    }
  }

  formatall() {
    this.setState({todo: this.state.todo.map((item, j) => {
      return(this.richtexify(item.note))
    })}, () => {this.sort()})
    this.setState({done: this.state.done.map((item, j) => {
      return(this.richtexify(item.note))
    })}, () => {this.sort()})
  }

  sort() {
    let copy = this.state.todo.slice()
    copy.sort(function(a, b){
      let aint = Number.POSITIVE_INFINITY
      let bint = Number.POSITIVE_INFINITY
      if(a.date !== null){aint = a.date.getTime()*1+a.priority*1}
      if(b.date !== null){bint = b.date.getTime()*1+b.priority*1}
      return aint - bint
    });
    this.setState({todo: copy})
  }

  formatstrip(list, index) {
    if (list === "todo") {
      this.setState({todo: this.state.todo.map((item, j) => {
        if (j === index) {return({
          note: this.striphtml(item.note),
          date: item.date,
          priority: item.priority})}
        else {return(item)}
      })})
    } else {
      this.setState({done: this.state.done.map((item, j) => {
        if (j === index) {return({
          note: this.striphtml(item.note),
          date: item.date,
          priority: item.priority})}
        else {return(item)}
      })})
    }
  }

  done(i) {
    let done = this.state.done
    let todo = []
    this.state.todo.map((item, j) => {
      if (j === i) {
        done.unshift(item)
      } else {
        todo.push(item)
      }
    })
    this.setState({done: done, todo: todo})
  }

  removeElement(list, index) {
    if (list === "todo") {
      let todo = []
      this.state.todo.map((item, j) => {
        if (j !== index) {todo.push(item)}
      })
      this.setState({todo: todo})
    } else {
      let done = []
      this.state.done.map((item, j) => {
        if (j !== index) {done.push(item)}
        else {return(item)}
      })
      this.setState({done: done})
    }
  }

  changenote(list, index, value) {
    let spacere = /<div><br><\/div>$/g
    let spaceform = /<br><\/b><\/div>$/g
    console.log(value.target.value)
    if(!spacere.test(value.target.value) && !spaceform.test(value.target.value)) {
      if (list === "todo") {
        let todo = this.state.todo.map((item, j) => {
          if (j === index) {return({note: value.target.value, date: item.date, priority: item.priority})}
          else {return(item)}
        })
        this.setState({todo: todo})
      } else {
        let done = this.state.done.map((item, j) => {
          if (j === index) {return({note: value.target.value, date: item.date, priority: item.priority})}
          else {return(item)}
        })
        this.setState({done: done})
      }
    } else {
      let copy = null
      if (list === 'done') {
         copy = this.state.done.slice()
         copy.splice(index-1, 0, {note: "", date: null, priority: -1})
         this.setState({done: copy}, () => {
           document.getElementById(index-1).focus()
         })
      } else {
         copy = this.state.todo.slice()
         copy.splice(index+1, 0, {note: "", date: null, priority: -1})
         this.setState({todo: copy}, () => {
           document.getElementById(index+1).focus()
         })
       }
    }
  }

  checkKeypress(list, index, value) {
    if (value.keyCode === 8 &&
      this.getCaretPosition(document.getElementById(index)) === 0) {
      if (list === 'done'){this.removeElement(list, index+1)}
      else {this.removeElement(list, index)}
    }
  }

  deleteDoneNotes() {
    this.setState({done: []})
  }

  render() {
    const listdo = this.state.todo.map((item, index) => {
      return (
        <div className='itemcontainer' key={index}>
          <input type='checkbox' checked={false} onChange={() => this.done(index)} />
          <ContentEditable
            id={index}
            onBlur={() => {this.format('todo', index)}}
            onKeyDown={(value) => this.checkKeypress('todo', index, value)}
            onChange={(value) => this.changenote('todo', index, value)}
            className='todonote'
            html={item.note} />
        </div>
      )
    })

    const listdone = this.state.done.map((item, index) => {
      return (
        <div className='itemcontainer' key={index}>
          <input type='checkbox' checked={true} onChange={() => this.undone(index)} />
          <ContentEditable
            id={-index-1}
            onBlur={() => this.format('done', index)}
            onKeyDown={(value) => this.checkKeypress('done', -index-1, value)}
            onChange={(value) => this.changenote('done', index, value)}
            className='todonote'
            html={item.note} />
        </div>
      )
    })

    return (
      <div>
        <div className='header'>
          <h1>Todo List</h1>
          <div className='button' onClick={() => {
            this.setState({todo: [{note: "", date: null, priority: -1}, ...this.state.todo]},
            () => {
              document.getElementById(0).focus()
            })
          }}>
            <div className='circle'>
              <img src={plus} height="12" width="12"/>
            </div>
          </div>
        </div>
        <div className='marginhorizontal'>
          <div className='spacer' />
          <h2>Do</h2>
          <div className='listcontainer'>{listdo}</div>
          <div className='donecontainer'>
            <h2>Done</h2>
              <div onClick={this.deleteDoneNotes} className='trashbin'>
                <img src={trash} height="12" width="12"/>
              </div>
          </div>
          <div className='listcontainer'>{listdone}</div>
          <div className='spacerbottom' />
        </div>
      </div>
    )
  }
}

export default Home
