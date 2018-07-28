import IO from 'socket.io-client'
import {randint} from 'src/utils/util'

export const CHAT = {
  minAvatar: 1,
  maxAvatar: 27,
  uid: null,
  type: null,
  nickname: null,
  avatar: null,
  socket: null,
  token: null,
  //退出
  logout() {
    this.socket.disconnect();
  },
  getDate() {
    let curr_time = new Date();
    let year = curr_time.getFullYear();
    let month = curr_time.getMonth() + 1;
    // month = month < 10 ? "0" + month : month;
    let date = curr_time.getDate();
    date = date < 10 ? "0" + date : date;
    let hours = curr_time.getHours();
    hours = hours < 10 ? "0" + hours : hours;
    let minutes = curr_time.getMinutes();
    minutes = minutes < 10 ? "0" + minutes : minutes;
    let seconds = curr_time.getSeconds();
    seconds = seconds < 10 ? "0" + seconds : seconds;
    return " " + month + "月" + date + "日" + hours + ":" + minutes + " "
  },

  //解散房间
  roomDelete(params) {
    return new Promise((resolve, reject) => {
      this.socket.emit('userSpace_chat_RoomDelete', params, (data) => {
        //  console.log('解散房间', params, data)
        if (data.status === 200) {
          resolve(data.data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },

  //踢出房间
  roomKickOut(params) {
    return new Promise((resolve, reject) => {
      this.socket.emit('userSpace_chat_RoomKickOut', params, (data) => {
        //  console.log('踢出房间', params, data)
        if (data.status === 200) {
          layer.msg('踢出房间成功~');
          resolve(data.data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },

  //房主授予成员为管理员
  roomAuthorizationManager(params) {
    return new Promise((resolve, reject) => {
      this.socket.emit('userSpace_chat_RoomAuthorizationManager', params, (data) => {
        //  console.log('房主授予成员为管理员', params, data)
        if (data.status === 200) {
          layer.msg(`${data.data.roomOwnerType === 2 ? '设置' : '取消'}管理员成功~`);
          resolve(data.data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },

  //邀请用户加入房间
  chatRoomInvite(params) {
    return new Promise((resolve, reject) => {

      this.socket.emit('userSpace_chat_RoomInvite', params, (data) => {
        //  console.log('邀请用户加入房间', data)
        if (data.status === 200) {
          // layer.msg('邀请用户加入房间成功~')
          resolve(data.data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },


  //修改昵称
  changeNickName(params) {
    return new Promise((resolve, reject) => {

      this.socket.emit('userSpace_chat_ChangeNickName', params, (data) => {
        // console.log('修改昵称', data)
        if (data.status === 200) {
          layer.msg('修改昵称成功~');
          resolve(data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },


  //新建房间
  createRoom(params) {
    return new Promise((resolve, reject) => {
      this.socket.emit('userSpace_chat_RoomCreate', params, (data) => {
        //console.log('新建房间', data)
        if (data.status === 200) {
          layer.msg('新建房间成功~');
          resolve(data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },

  //修改房间成员禁言状态
  roomAnExcuse(params) {
    return new Promise((resolve, reject) => {
      this.socket.emit('userSpace_chat_roomAnExcuse', params, (data) => {
        // console.log('禁言状态', data, params)
        if (data.status === 200) {
          layer.msg('操作成功');
          resolve(data)
        } else {
          reject(data.message);
          layer.msg(data.message || '连接服务器失败')
        }
      })
    })
  },

  //提交聊天消息内容
  sendMsg(message, _this) {
    return new Promise((resolve, reject) => {
      if (null == this.uid) {
        layer.msg("请先登录");
        return;
      }

      if (!message) {
        layer.msg("发送消息不能为空");
        return;
      }

      let roomname = _this.currentRoom._roomName;


      let obj = {
        srcid: _this.member.id,
        nickname: _this.member.nickname,
        namespace: _this.member.namespace,
        userType: this.type, //会员 1管理员
        content: encodeURIComponent(message)
      };

      if(obj.content.length / 1024 > 100){
        return layer.msg('您发送的内容不能超过100kb,请删除部分后再试')
      }

      if (roomname === '_$hill') {
        //主聊天室发送消息
        this.socket.emit('userSpace_chat_send', obj, (data) => {
          //  console.log('主聊天室发送消息', data, obj)

          if (data.status === 200) {
            obj.arrived = 1;
            resolve(obj)
          } else {
            obj.arrived = 0;
            layer.msg(data.message || "服务器连接失败！");
            reject(obj)
          }

        });
      } else {
        obj.roomname = _this.currentRoom.roomname;
        obj.roomOwnerName = _this.currentRoom.roomownername;

        // 房间发送消息
        this.socket.emit('userSpace_chat_roomtalk', obj, (data) => {
          // console.log('房间发送消息', data)

          if (data.status === 200) {
            obj.arrived = 1;
            resolve(obj)
          } else {
            obj.arrived = 0;
            layer.msg(data.message || "服务器连接失败！");
            reject(obj)
          }

        });

      }

      //arrived 0发送失败 1发送成功 2正在发送

      obj.historyType = 3;
      obj.nickname = this.getDate();
      obj.arrived = 2;
      obj.content = decodeURIComponent(obj.content);
      addAvatar(_this.allRoom[roomname].member.list, obj);


      //清空输入框
      $('#summernote').html('');
      $('.note-editable').html('');
    })


  },


  //切换房间
  joinRoom(room, _this, i = 5) {
    if (!room.roomname) {
      layer.msg("房间名不能为空");
      return;
    }

    let obj = {
      roomOwnerName: room.roomownername,
      roomName: room.roomname
    };

    this.socket.emit('userSpace_chat_roomjoin', obj, (data) => {
      //console.log('切换房间', data)

      if (data.status === 200) {
        let _data = data.data;

        //分配每个成员身份
        getRole(_data.roomUsers, _data.roomOwner, _this.member.id);

        _data.roomUsers.forEach(el => {

          //随机人员列表头像
          el.avatar = `ava-${randint(this.minAvatar, this.maxAvatar)}`;

          //默认都不在线
          el.online = 0;

          //默认都不在线
          el.showMenu = false;


          //处理在线
          _data.inRoomUsers.some(rm => {
              if (rm.id === el.id) {
                rm.historyType = 1;
                rm.chatContent = `欢迎${rm.nickname}加入`;

                el.online = 1;
                return true
              }
              return false
            }
          )
        });

        //处理当前房间禁言状态
        _data.roomUsers = _data.roomUsers.map(el => {
          el.anexcuse = el.room.roomanexcuse;
          return el
        });


        //读取本地缓存.
        let sess = JSON.parse(sessionStorage.getItem(room._roomName)) || [];
        let obj = {
          //  historyContent: sess.concat(_data.inRoomUsers),
          historyContent: sess,
          member: {
            roomOwner: _data.roomOwner,
            list: _data.roomUsers,  // 成员列表
          }
        };

        //判断当前房间是否已创建，创建了直接赋值 Object.assign，未创建调用set方法
        if (_this.allRoom[room._roomName]) {
          _this.allRoom[room._roomName] = obj;
        } else {
          _this.$set(_this.allRoom, room._roomName, obj)
        }

        //默认所有消息已读
        room.msgIndex = _this.allRoom[room._roomName].historyContent.length;

      } else {
        if (data.status === 502) {
          // console.log(`房间${room.roomname}创建失败,重连倒数${i}次`)

          if (i < 1) return;
          this.joinRoom(room, _this, --i)
        }
      }

    });


  },

  //初始化
  initChat(uid, type, nickname, avatar, token, _this, cmd_serverUrl) {
    //初始化用户信息
    this.uid = uid;
    this.type = type;
    this.nickname = encodeURIComponent(nickname);
    this.avatar = avatar;
    this.token = token;

    //连接websocket后端服务器
    this.socket = IO.connect(`${cmd_serverUrl}/userSpace?uid=${uid}&token=${encodeURIComponent(token)}&type=${type}`
      , {reconnectionDelay: 180000, timeout: 180000}
    );


    //成功链接
    this.socket.on('connect', function () {
      // console.log('已成功连接到服务器')
      _this.isOnline = true;
    });


    //重连
    this.socket.on('reconnect', function () {
      // console.log('重连*********');
    });

    //正在链接
    this.socket.on('connecting', function () {
      // console.log('请稍等，正在连接服务器')
    });

    //断开链接
    this.socket.on('disconnect', () => {
      // console.log('服务器已断开连接')
      // console.log(this.getDate())
      _this.historyContent.push({chatContent: '服务器已断开连接...', historyType: 1});
      // this.logout();
      _this.isOnline = false;
    });


    //监听大厅赋予管理员权限
    this.socket.on('userSpace_chat_NameSpaceRoleType_order', (data) => {
      _this.allRoom._$hill.member.list.forEach(el => {
        if (el.id === data.id) {
          el.role = data.roleType === 1 ? 4 : 3;
          _this.member.roleType = data.roleType;
          layer.msg(`您${data.roleType === 1 ? '成为' : '不再是'}大厅的管理员~`)
        }
      })
    })


    //监听房间解散
    this.socket.on('userSpace_chat_RoomDelete_radio', (data) => {
      //console.log('监听房间解散', data)

      let _roomName = data.roomOwnerName + data.roomName;

      let room = _this.allRoom[_roomName];

      if (!room) return;

      //如果在被解散房间 定位到大厅
      if (_this.currentRoom._roomName === _roomName) {
        _this.currentRoom = _this.member.entity.rooms[0]
      }

      //循环遍历所有房间 删除该房间
      _this.member.entity.rooms.forEach((el, index, array) => {
        if (el._roomName === _roomName) {
          array.splice(index, 1)
        }
      });

      //删除该房间数据
      _this.$delete(_this.allRoom, _roomName);

      layer.msg(`${data.roomName}聊天室已被房主解散~`)

    });


    //监听成员被踢出房间
    this.socket.on('userSpace_chat_RoomKickOut_RADIO', (data) => {
      //console.log('监听成员被踢出房间', data)

      let _roomName = data.roomOwnerName + data.roomName;

      let room = _this.allRoom[_roomName];

      if (!room) return;
      //如果是房主 不能踢出
      if (room.member.roomOwner === data.tagId) return;

      //如果被踢出是本人
      if (_this.member.id === data.tagId) {
        //如果正在当前房间 让用户去大厅
        if (_this.currentRoom._roomName === _roomName) {
          _this.currentRoom = _this.member.entity.rooms[0]
        }

        //循环遍历所有房间 删除该房间
        _this.member.entity.rooms.forEach((el, index, array) => {
          if (el._roomName === _roomName) {
            array.splice(index, 1)
          }
        });

        //删除该房间数据
        _this.$delete(_this.allRoom, _roomName);


      } else {
        //找到该房间删除此人
        room.member.list.forEach((el, index, array) => {
          if (el.id === data.tagId) {
            array.splice(index, 1)
          }
        });

        //递归删除被提成员的所有发言
        deleteSameId(room.historyContent, data.tagId)
      }
    });


    //监听成员成为管理员
    this.socket.on('userSpace_chat_RoomAuthorizationManager_clinet', (data) => {
      //  console.log('监听成员成为管理员', data)

      let _roomName = data.roomOwnerName + data.roomName;

      let room = _this.allRoom[_roomName];

      if (!room) return;

      //如果是房主 不修改
      if (room.member.roomOwner === data.id) return;

      let flag = Boolean(data.roomOwnerType === 2);

      //循环遍历所有房间 找到自己赋予管理员权限
      _this.member.entity.rooms.forEach((el, index, array) => {
        if (el._roomName === _roomName) {
          el.roomownertype = flag ? 2 : 0;
        }
      });

      // 循环遍历所有成员 找到自己赋予管理员权限
      room.member.list.forEach(el => {
        if (el.id === data.uid) {
          el.room.roomownertype = flag ? 2 : 0;
          el.role = flag ? 2 : 99;
        }
      });


      layer.msg(`您${data.roomOwnerType === 0 ? '不再是' : '已成为'}${data.roomName}聊天室的管理员~`)
    });

    //监听所有房间禁言
    this.socket.on('userSpace_chat_roomAnExcuse_radio', (data) => {
      //console.log('监听所有房间禁言', data)

      let _roomName = data.roomOwnerName + data.roomName;

      let room = _this.allRoom[_roomName];

      if (!room) return;

      //修改当前禁言状态
      room.member.list.forEach(el => {
        if (el.id === data.id) {
          el.anexcuse = data.isAnExcuse
        }
      });

      //解除禁言不删除记录
      if (data.isAnExcuse === 1) return;

      if (!room) return;

      //如果是房主 不删除发言记录
      if (room.member.roomOwner === data.id) return;

      //递归删除被禁言成员的所有发言
      deleteSameId(room.historyContent, data.id)

    });


    //监听修改昵称
    this.socket.on('userSpace_chat_ChangeNickName_radio', (data) => {
      //  console.log('监听修改昵称', data)

      for (let value of Object.values(_this.allRoom)) {
        value.member.list.forEach(el => {
          if (el.id === data.id) el.nickname = data.nikeName
        })
      }

    });


    //你的其他拉你进群了
    this.socket.on('userSpace_room_invite', ({data}) => {
      // console.log('你的其他拉你进群了', data)
      let _roomName = data.roomownername + data.roomname;
      data._roomName = _roomName;


      this.joinRoom(data, _this);

      layer.msg(`您的其他邀请您进入房间${data.roomname}`);
      _this.member.entity.rooms.push(data);
    });

    //有成员加入群
    this.socket.on('userSpace_room_invite_radio', ({data}) => {
      // console.log('有成员加入群', data)
      let _roomName = data.invoteUsers[0].room.roomownername + data.invoteUsers[0].room.roomname;
      if (!_this.allRoom[_roomName]) return
      let member = _this.allRoom[_roomName].member;
      //随机头像
      data.invoteUsers.forEach(el => {
        el.avatar = `ava-${_this.$utils.randint(CHAT.minAvatar, CHAT.maxAvatar)}`;
        el.showMenu = false
      });

      //再次赋予成员角色权限
      getRole(data.invoteUsers, member.roomOwner, _this.member.id);

      member.list.push(...data.invoteUsers);
    });


    //监听所有房间消息
    this.socket.on('userSpace_chat_roomtalk_radio', (data) => {
      //   console.log('监听所有房间消息', data)
      let _roomName = data.roomOwnerName + data.roomname;

      let room = _this.allRoom[_roomName];
      if (!room) return;
      data.historyType = 2;
      data.nickname += this.getDate();
      data.content = decodeURIComponent(data.content);
      addAvatar(room.member.list, data);
      room.historyContent.push(data);
      //  sessionStorage.setItem(data.roomname, JSON.stringify(room.historyContent));
    });


    //成员加入所有房间
    this.socket.on('userSpace_chat_roomjoin_new', (data, rooms) => {
      // console.log('成员加入所有房间', data)
      let _roomName = rooms.roomOwnerName + rooms.roomName;

      let room = _this.allRoom[_roomName];
      if (!room) return;
      data.historyType = 1;
      data.chatContent = `欢迎${data.nickname}加入`;

      handleOnlineState(_this, data, _roomName, true);

    });


    //主聊天室接收消息事件
    this.socket.on('userSpace_chat_receive', (obj) => {
      //    console.log('主聊天室接收消息事件', obj)

      obj.historyType = 2;
      obj.content = decodeURIComponent(obj.content);
      obj.nickname += this.getDate();

      //管理员
      if (Number(obj.userType) === 1) {
        obj.avatar = 'ava-1'
      } else {
        addAvatar(_this.allRoom._$hill.member.list, obj);
      }
      _this.allRoom._$hill.historyContent.push(obj);
      // sessionStorage.setItem('_$hill',JSON.stringify(_this.allRoom._$hill.historyContent));
    });

    //成员加入主聊天室事件
    this.socket.on('userSpace_broadcast_newConnect', (obj) => {
      //   console.log('成员加入主聊天室事件', obj)

      obj.historyType = 1;
      obj.chatContent = `欢迎${obj.nickname}加入`;

      handleOnlineState(_this, obj, '_$hill', true);

    });

    //成员退出主聊天室
    this.socket.on('userSpace_broadcast_disConnect', function (obj) {
      // console.log('成员退出主聊天室', obj)

      obj.historyType = 1;
      obj.chatContent = `${obj.nickname}已退出`;

      //遍历所有房间 下线
      for (let [key, value] of Object.entries(_this.allRoom)) {
        //遍历当前房间是否存在此成员
        let flag = value.member.list.some(val => {
          return obj.id === val.id
        });
        if (flag) handleOnlineState(_this, obj, key)
      }
    });

    //获取主聊天室所有成员
    this.socket.on('userSpace_user_list', (obj) => {
      //console.log('获取主聊天室所有成员', obj)

      //大厅成员随机头像
      obj.userList.forEach(el => {
          el.avatar = `ava-${randint(this.minAvatar, this.maxAvatar)}`;
          obj.entity.id === el.id ? el.role = 3 : el.role = 99;
          if (el.roletype === 1) el.role = 4;
        }
      );


      //处理房间字段
      obj.entity.rooms.forEach(room => {
        room.msgIndex = 0;
        room._roomName = room.roomownername + room.roomname
      });

      //获取历史记录下标
      let hillMsgIndex = JSON.parse(sessionStorage.getItem('_$hill')) && JSON.parse(sessionStorage.getItem('_$hill')).length;

      let room = {
        roomownername: '_$hill',  //  大厅 不能修改
        roomname: '_$hill',      // 不能修改
        _roomName: '_$hill',     // 数组key值  不能修改
        anExcuse: 1,                 //禁言
        roomAllow: 1,           //允许进入
        roomownertype: 11,         // 大厅
        roomtype: 1,              // 1基础房间 2自己新建房间3其他新建房间
        msgIndex: hillMsgIndex || 0,   // 大厅已读消息下标
      };

      //添加大厅到房间列表第一位
      obj.entity.rooms.unshift(room);


      //初始化当前展示数据
      _this.member.page = 1;
      _this.member.id = obj.entity.id;
      _this.member.nickname = obj.entity.nickname;
      _this.member.copyNickname = obj.entity.nickname;
      _this.member.namespace = obj.entity.namespace;
      _this.member.parentname = obj.entity.parentname;
      _this.member.isagent = obj.entity.isagent;
      _this.member.username = obj.entity.username;
      _this.member.roleType = obj.entity.roletype;
      _this.member.entity.rooms = obj.entity.rooms;
      _this.anexcuse = obj.entity.anexcuse;

      //初始化大厅数据
      _this.allRoom._$hill.member.entity = obj.entity;
      _this.allRoom._$hill.member.list = obj.userList;

      //初始化成功 默认切换到大厅
      _this.currentRoom = room;

      //默认链接所有房间
      obj.entity.rooms.forEach(room => {
        if (room.roomownername !== '_$hill') {
          this.joinRoom(room, _this)
        }
      })


    });

  }
  ,

  //如果web端session超时，socket断开，10分钟扫描一次

  sessionTimeout: function () {
    $.ajax({
      type: 'POST',
      url: "/",
      dataType: "json",
      cache: false,
      success: function (json) {
        var timeout = parseInt(json.message);
        // session超时后，socket断开，服务端就可以监听到释放资源
        if (timeout == 0) {
          this.socket.disconnect();
        }
      },
      error: function () {
        this.socket.disconnect();
      }

    });
  }
};


/**
 * 随机头像
 * @param memberList 在线列表人员
 * @param obj        需要随机的人员
 */
export function addAvatar(memberList, obj) {
  if (!memberList.some(m => {
    if (m.id === obj.srcid) {
      obj.avatar = m.avatar;
      return true
    }

    return false
  })) {
    obj.avatar = `ava-${randint(CHAT.minAvatar, CHAT.maxAvatar)}`;

  }
}


/**
 * 成员加入房间
 * @param _this vue实例对象
 * @param obj   后台返回数据
 * @param room  当前房间
 * @param online  上线还是下线
 */

export function handleOnlineState(_this, obj, room, online) {

  if (online) {
    //修改在线列表 上线人员状态
    if (!_this.allRoom[room].member.list.some((e, index, arr) => {
      if (e.id === obj.id) {
        if (e.online === 0) {
          e.online = 1;
          _this.$set(arr, index, e);
        }
        return true
      }
      return false
    })) {
      obj.avatar = `ava-${randint(CHAT.minAvatar, CHAT.maxAvatar)}`;
      _this.allRoom[room].member.list.push(obj)
    }

  } else {

    //修改在线列表 下线人员状态
    _this.allRoom[room].member.list.forEach((el, index, array) => {
      if (el.id === obj.id && el.online === 1) {
        el.online = 0;
        _this.$set(array, index, el)
      }
    });

  }


  //添加到聊天记录
  // _this.allRoom[room].historyContent.push(obj);


}


/**
 * 尾递归删除数组id相同的子集
 * @param array   数组
 * @param id   传入需要删除的id
 */
export function deleteSameId(array, id) {
  array.some((el, index, arr) => {
    if (el.srcid === id) {
      arr.splice(index, 1);
      return deleteSameId(arr, id)
    }
    return false
  })
}

/**
 * 给所有房间成员赋予身份 1房主 2管理员 3自己 4匹配大厅管理员 99其他成员
 * @param roomUsers 房间所有成员
 * @param roomOwner 房主id
 * @param id        自己的id
 */
export function getRole(roomUsers, roomOwner, id) {

  roomUsers.forEach(el => {
    //匹配房主
    if (el.id === roomOwner) {
      el.role = 1;
    } else if (el.room.roomownertype === 2) {
      //匹配管理员
      el.role = 2;
    } else if (el.id === id) {
      //匹配自己
      el.role = 3;
    }else if (el.room.roomownertype === 11) {
      //匹配大厅管理员
      el.role = 4;
    }
    else {
      //其他都是成员
      el.role = 99;
    }
  });
}
