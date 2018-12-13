var http = require('http')
var fs = require('fs')
var url = require('url')

var port = process.env.PORT || 8888;

let sessions = {

}


var server = http.createServer(function (request, response) {
  var temp = url.parse(request.url, true)
  var path = temp.pathname
  var query = temp.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/


  if (path === '/') {
    var string = fs.readFileSync('./index.html', 'utf8')
    let cookies = ''
    if(request.headers.cookie){
      cookies = request.headers.cookie.split('; ')//['email=1@', 'a=1','b=2']
    }
    let hash = {}
    for(let i = 0;i<cookies.length;i++){
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    }
    //let mySession = sessions[query.sessionId] //不通过cookie
    let mySession = sessions[hash.sessionId]
    let email
    if(mySession){
      email = mySession.sign_in_email
    }
    let users = fs.readFileSync('./db/users','utf8')
    users = JSON.parse(users)
    let foundUser
    for(let i =0;i<users.length;i++){
      if (users[i].email === email) {
        foundUser = users[i]
        break;
      }
    }
    if(foundUser){
      string = string.replace('__password__',foundUser.password)
    }else{
      string = string.replace('__password__','不知道')
    }
   
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()

  }else if(path === '/sign_up' && method === 'GET'){ //GET  /POST  /DELETE
    let string = fs.readFileSync('./sign_up.html','utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/sign_up' && method === 'POST'){ //GET  /POST  /DELETE
    readBody(request).then((body)=>{
      let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
      let hash = {}
      strings.forEach((string)=>{
        // string == 'email=1'
        let parts = string.split('=') // ['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value) // hash['email'] = '1'
      })
      let {email, password, password_confirmation} = hash
      if(email.indexOf('@') === -1 ){
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json','utf8')

        response.write(`{
          "errors": {
            "email": "invalid"
          }
        }`)
      }else if(password != password_confirmation){
        response.statusCode = 400
        response.write('password not match')
      }else{
        var users = fs.readFileSync('./db/users','utf8') //加入数据库
        try{
          users = JSON.parse(users)
        }catch(exception){
          users = []
        }// 如果传入的不符合直接传入空数组
        let inUse = false
        for(let i =0;i<users.length;i++){
          let user = users[i]
          if (user.email === email) {
            inUse = true
            break;
          }
        }
        if (inUse) {
          response.statusCode = 400
          response.write('email in use')
        } else {
          users.push({ email: email, password: password })
          var usersString = JSON.stringify(users)
          fs.writeFileSync('./db/users', usersString)
          response.statusCode = 200
        }
      }
      response.end()
    })
  }else if(path === '/sign_in' && method === 'GET'){ //GET  /POST  /DELETE
    let string = fs.readFileSync('./sign_in.html','utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/sign_in' && method === 'POST'){//登录
    readBody(request).then((body)=>{
      let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
      let hash = {}
      strings.forEach((string)=>{
        // string == 'email=1'
        let parts = string.split('=') // ['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value) // hash['email'] = '1'
      })
      let {email, password} = hash
      console.log('email')
      console.log(email)
      console.log('password')
      console.log(password)
      var users = fs.readFileSync('./db/users','utf8') 
        try{
          users = JSON.parse(users)
        }catch(exception){
          users = []
        }
        let found
        for(let i=0;i<users.length;i++){
          if(users[i].email === email &&  users[i].password === password){
          found = true
          break;
        }
      }
      if(found){
        //Set-Cookie: <cookie-name>=<cookie-value> 
        let sessionId = Math.random() * 100000
        sessions[sessionId] = {sign_in_email: email}
        response.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly`)//加入httpOnly，JS无法修改cookie
        // response.setHeader(`{"sessionId":${sessionId}}`) //不通过上面的cookie，sessionId通过session传给前端通过localStorage也可以实现
        response.statusCode = 200
      }else{
        response.statusCode = 401
      }
      response.end()
    })
  }else if (path === '/style.css') {
    var string = fs.readFileSync('./style.css', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/css','utf8')
    response.write(string)
    response.end()

  }else if (path === '/main.js') {
    var string = fs.readFileSync('./main.js', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/javascript','utf8')
    response.write(string)
    response.end()
  } else if (path === '/xxx') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/json', 'utf8')
    response.setHeader('Access-Control-Allow-Origin', 'http://frank.com:8001')//CORS 跨域
    response.write(`
      {
        "note":{
          "to": "小谷",
          "from": "阿经",
          "heading": "打招呼",
          "comtent": "hi"
        }
      }  
      `)//这不是对象，服务器只能返回字符串
    response.end()
  } else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write('找不到对应的路径')
    response.end()
  }

  /******** 代码结束，下面不要看 ************/
})

function readBody(request){
  return new Promise((resolve,reject)=>{
    let body = []; //请求体
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString(); // at this point, `body` has the entire request body stored in it as a string
      resolve(body)
  })
})
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)


