<template>
  <div v-show="showChat"
       :class="[
       `group-chat` ,
       {'side-right-hide':shrink},
       {'mini-room':!resizeChatRoom}
       ]"
       v-drag
       tabindex="-1"
  >

    <!-- 头部信息 -->
    <div class="group-chat-header">
      <div class="group-chat-room">
        <div>
          <!-- 当前选中房间 -->
          <label
            v-if="isOnline"
            style="padding-right: 10px;position:relative;"
            @click="showRoom=!showRoom"
            class="room-title not-move">
            <span
              class="not-move">
              {{currentRoom.roomownertype | changeRoomOwner(currentRoom)}}聊天室
              <i class="not-move" v-if="jurisdiction.includes('cmd_showPersonNum')">
                ({{member.list.length}}人)
              </i>
            </span>

            <span class="triangle-down not-move"></span>
            <i v-if="unreadMsgTotal" class="red-round not-move"></i>
          </label>
          <span v-else class="not-move"  style="color: #ec002c;">
              <img style="vertical-align: middle" src="./images/loading.gif" alt="">&nbsp; 正在链接...
            </span>

          <!-- 所有房间列表 -->
          <div :class="`room-dropdown not-move ${showRoom?'show-drop':''}`">
            <div v-for="item in member.entity.rooms"
                 :class="[`c-room not-move `,
                 {'room-disable':item.roomAllow===0},
                 {'room-active':activeRoom(item._roomName)}
                 ]"
                 :title="item.roomownertype|titleTip"
                 :key="item._roomName"
                 @click="changeRoom(item)">
              <span
                :class="`not-move room-title-${item.roomownertype}`"
              ></span>
              {{item.roomownertype | changeRoomOwner(item)}}
              <i v-if="newMsgPrompt(item)" class="not-move msg-prompt">{{newMsgPrompt(item)}}</i>
            </div>

          </div>
        </div>
      </div>

      <!-- 头部图标 -->

      <i
        @click="showRoomMenu=!showRoomMenu"
        style="right: 158px;"
        class="room-handle-menu not-move"
        title="操作菜单">
      </i>

      <div v-show="showRoomMenu" class="menu-wrapper not-move">
        <i
          v-if="Number(member.isagent)===1"
          @click="hideAll('showAddRoom')"
          style="right: 158px;"
          class="create-room-menu not-move">
          新建房间
        </i>

        <i
          @click="hideAll('perMenu')"
          class="member-menu not-move">
          修改昵称
        </i>

        <i
          v-if="jurisdiction.includes('hasSendPlan')"
          @click="hideAll('showPlan')"
          class="not-move">
          发布投注计划
        </i>

        <i
          v-if="jurisdiction.includes('hasDeleteRoom')"
          @click="deleteRoom"
          class="not-move">
          解散当前房间
        </i>

      </div>


      <i @click="resizeChat"
         :title="resizeChatRoom?'缩小':'放大'"
         :class="`resize-chat not-move ${resizeChatRoom?'narrow':''}`"></i>

      <i @click="closeChat" title="关闭" class="close-chat not-move"></i>

    </div>

    <!-- 聊天主体部分 -->
    <div class="group-chat-body">
      <!-- 左侧聊天区域 -->
      <div class="side-left">
        <div
          @click="hideAll"
          class="chat-history">

          <div
            :key="index"
            v-for="(item,index) in historyContent">

            <!-- 通知消息 -->
            <div v-if="item.historyType===1" class="chat-tip">{{item.chatContent}}</div>

            <!-- 成员发送的消息 -->
            <div v-else :class="['chat-operator',{'chat-self':item.historyType===3}] ">

              <div class="member-info">
                <div :class="`member-avatar  ${item.avatar}`"></div>
              </div>

              <div class="chat-bubble">
                <div class="chat-dco"
                     v-openImages
                     @click="fetchPlan"
                     v-html="item.content">
                </div>
                <p
                  :style="{color: item.userType*1===1?'#aa3fff':'#ccc'}"
                  :title="item.nickname"
                  class="chat-name">
                  {{item.nickname}}</p>
              </div>


              <!-- 重发消息图标 -->
              <img
                v-if="item.arrived===0"
                @click="sendAgain(item,index)"
                class="chat-warning"
                src="./images/warning.png" title="重新发送消息">

            </div>

          </div>


          <div class="note" style="height: 54px;"></div>

        </div>


        <div class="chat-entry" @keyup.enter="sendChatContent">
          <div id="summernote"></div>


          <form @submit.prevent id="uploadFormImg" class="up-form">
            <!--<input-->
            <!--id="fileImg"-->
            <!--@change="getFileImg"-->
            <!--type="file"-->
            <!--name="uploadImg"-->
            <!--ref="uploadImg"-->
            <!--accept="image/jpeg,image/png"/>-->


            <!--   <i @click="handleUploadImg"
                  title="上传图片"
                  class="up-picture"></i>-->

            <i
              @click="handleEmoji"
              title="表情"
              :class="['up-countenance',
              {'active-emoji':showEmoji}
              ]"></i>

            <div
              v-show="showEmoji"
              class="emoji"></div>


            <!-- 发送按钮 -->
            <button
              class="enter-btn"
              :disabled="!prohibit"
              @click="sendChatContent">
              {{sendOut}}
            </button>

          </form>
        </div>
      </div>

      <!-- 右侧成员列表 -->
      <div v-if="jurisdiction.includes('cmd_rightPanel')">
        <div class="side-bar-r">
          <i @click="shrink=!shrink" class="side-bar-icon"></i>
        </div>
        <div class="side-right">
          <div class="member-content">
            <ul
              @click="hideMemberMenu"
              class="member-wrapper">

              <li
                @click="showAddMemberList"
                v-if="jurisdiction.includes('hasAddMember')">
                <div
                  title="邀请成员加入聊天室"
                  class="add-member"></div>
              </li>


              <li
                :key="index"
                v-for="(item,index) in sortMemberList">
                <div
                  class="member-avatar">
                  <div
                    :class="
                   ` avatar ${item.avatar}
                    ${item.online===0?'grayscale':''}`">

                  </div>

                  <div
                    v-if="jurisdiction.includes('hasAnExcuse')"
                    class="avatar-shade">
                  <span
                    :title="item|anexcuseTitle"
                    @click.stop="handleAnExcuse(item)"
                    :class="item.anexcuse?'unan-excuse':'an-excuse'"></span>
                  </div>
                </div>

                <p
                  @click.stop="showHandleMenu(item)"
                  :title="item.username"
                  :class="`member-name member-name-${item.role}`">

                  <span>
                      <img style="top: 3px;" v-if="item.role===1" src="./images/fz.png" alt="房主" title="房主">
                      <img v-if="item.role===2" src="./images/gly.png" alt="管理员" title="管理员">
                    {{item.nickname}}
                  </span>
                </p>

                <!-- 不能修改房主 不能修改自己 基础房间不能改 -->
                <i
                  @click.stop="showHandleMenu(item)"
                  v-if="item.role!==1 && item.id!==currentRoom.customerid && jurisdiction.includes('handleMenu')"
                  :class="`more-menu
                ${item.showMenu?'more-menu-active':''}`">

                </i>

                <div
                  v-show="item.showMenu"
                  class="handle-menu">

                  <span v-if="jurisdiction.includes('setAdmin')"
                        @click.stop="roomAuthor(item)">
                    {{item.room.roomownertype===2?'取消':'设为'}}管理员
                  </span>

                  <span
                    v-if="jurisdiction.includes('kickOut')"
                    @click.stop="roomLeave(item)">
                    踢出聊天室
                  </span>
                </div>
              </li>
            </ul>
            <!-- 分页 -->
            <!--<div class="member-pagination">-->
            <!--<the-pagination-->
            <!--:limit="member.limit"-->
            <!--:page.sync="member.page"-->
            <!--:total="member.list.length"-->
            <!--small-->
            <!--&gt;</the-pagination>-->
            <!--</div>-->
          </div>
        </div>
      </div>

      <!-- 新增房间 -->
      <div
        v-if="Number(member.isagent)===1"
        v-show="showAddRoom"
        class="add-room-content">
        <div class="add-room-main">
          <input
            placeholder="聊天室名称,创建后不能再修改"
            type="text"
            v-model="addRoomName">
          <button
            @click="createRoom(addRoomName)"
            class="button">
            完成并创建
          </button>
        </div>
        <div
          @click="showAddRoom=false"
          class="add-room-shade"></div>
      </div>

      <!--修改昵称  -->
      <div style="z-index: 4;" v-show="perMenu">

        <div
          @click.stop="perMenu=false"
          class="per-info-shade"></div>
        <div class="per-info">
          <div class="per-avatar">
            <div class="ava"></div>
          </div>
          <img class="ava-img" src="./images/ava-b.png" alt="">
          <input
            class="per-input"
            type="text"
            v-model="member.copyNickname"
          >
          <button
            @click.stop="changeNiceName(member.copyNickname)"
            class="per-submit button">
            保存
          </button>
        </div>
      </div>

      <!-- 添加房间成员 -->
      <div
        v-show="showAddMember"
        class="add-room-member">
        <div class="add-member-main">
          <p>添加成员</p>
          <p
            style="position: absolute"
            v-show="memberList.length<1">
            暂无可邀请成员</p>
          <ul>
            <li
              @click="item.active=!item.active"
              :class="{active:item.active}"
              :key="index"
              v-for="(item,index) in memberList">
              {{item.username}}
            </li>
          </ul>
          <button
            @click="roomInvite"
            class="button">
            确定邀请
          </button>
        </div>
        <div
          @click="showAddMember=false"
          class="add-room-shade"></div>
      </div>

      <!-- 发布计划 -->
      <the-plan
        @sendPlan="sendPlan"
        :show-plan.sync="showPlan">
      </the-plan>


    </div>
  </div>

</template>

<script>
  /**
   * 聊天室
   * {boolean} 是否显示聊天室
   *
   * 事件
   * 具体请看对应方法的对应注释
   */
  import ThePagination from 'src/components/ThePagination/index'
  import {CHAT} from './chat.js'
  import emojione from 'emojione'
  import {USER_TYPE} from 'src/config/staticEnv'
  import ThePlan from './children/ThePlan'

  export default {
    name: "chatRoom",
    components: {
      ThePagination,
      ThePlan
    },
    props: {
      showChat: {
        default: false,
        type: Boolean
      }
    },
    data() {
      return {
        member: {
          limit: 21,
          page: 1,
          list: [],  // 成员列表
          id: '',    //当前成员id
          nickname: '', //当前成员 昵称
          username: '', //当前成员 name
          parentname: '', //父级name
          isagent: '', //是否是vip 1是 2不是
          copyNickname: '', //当前成员 name 复制
          namespace: '', //
          roleType: '', //大厅权限 0 成员 1管理员
          entity: {
            rooms: []
          }
        },  //
        unreadMsgNum: {
          _$hill: 0
        },
        unreadMsgTotal: 0,

        historyContent: [],  //聊天区内容
        allRoom: {
          _$hill: {
            historyContent: JSON.parse(sessionStorage.getItem('_$hill')) || [],
            member: {
              list: [],  // 成员列表
            }
          }
        },     //所有房间

        shrink: Number(this.$store.state.user.customerCmd.cmd_rightPanel) === 0,    //是否展示右边所有成员
        perMenu: false,   // 展示个人信息面板
        showRoom: false,   //是否展示所有房间
        showEmoji: false,  //显示表情
        showPlan: false,  //显示发布计划
        showFastBet: false,  //显示快速投注
        showRoomMenu: false,  //显示操作菜单
        lottery: {},


        anexcuse: 0,  //0 禁言 1不禁言
        isOnline: false,   //和服务器是否链接
        sendOut: '发送',  //发送间隔

        timerSendMsg: null, //发送消息间隔定时器
        intervalTime: 3, //发送消息间隔时间

        resizeChatRoom: true,   //缩小 or 放大

        currentRoom: {
          roomname: '',           //房间名字
          roomownername: '',        //房主名字
          _roomName: '',         //房主名字+房间名字
          roomownertype: '',        //房间类型  1房主 0成员 2管理员 11大厅
          roomtype: '',         //  1基础房间   2自己新建房间 3其他新建房间
          id: '',
          msgIndex: '',               //当前已读消息下标
          roomallowin: '',
          roomanexcuse: '',
          customerid: '',
        },  //当前房间

        customerCmd: this.$store.state.user.customerCmd,//房间权限

        addRoomName: '',  //新增房间名字
        showAddRoom: false, //是否显示新增房间
        showAddMember: false, //是否显示添加房间成员
        memberList: []   //所有人员
      }
    },
    watch: {
      //改变房间
      'currentRoom._roomName'(roomname) {
        for (let [key, value] of Object.entries(this.allRoom)) {
          if (key === roomname) {
            this.member.page = 1;
            this.historyContent = value.historyContent;
            this.member.list = value.member.list;
          }
        }

      },
      //有新增消息时 处理数据 自动更新本地储存
      allRoom: {
        handler(val) {
          // console.log('allroom')
          let _roomName = this.currentRoom._roomName;
          this.scrollDown();
          if (!_roomName) return;
          let content = val[_roomName].historyContent;
          let index = content.length - 1;


          //判断不是空数组  转换表情为图片
          if (index >= 0) {
            let currentContent = content[index];
            let value = emojione.unicodeToImage(currentContent.content || currentContent.chatContent);

            if (currentContent.content) {
              currentContent.content = value
            } else {
              currentContent.chatContent = value;
            }
          }


          //聊天框未关闭的情况下 当前房间不提醒消息
          this.member.entity.rooms.forEach(el => {
            if (this.showChat && el._roomName === _roomName) el.msgIndex = content.length
          });


          //存储本地
          for (let [key, value] of Object.entries(val)) {
            try {
              sessionStorage.setItem(key, JSON.stringify(value.historyContent));
            } catch (oException) {
              if (oException.name === 'QuotaExceededError') {
                console.log('超出本地存储限额,将清空本地记录!');

                //所有房间聊天记录删除
                for (let r in val) {
                  this.allRoom[r].historyContent.splice(0, val[r].historyContent.length);
                  sessionStorage.removeItem(r);
                }

                //所有房间已读消息下标重置为0
                this.member.entity.rooms.forEach(room => {
                  room.msgIndex = 0
                })

              }
            }
          }
        },
        deep: true
      },

      //未读消息总数
      unreadMsgNum: {
        handler(num) {
          let total = 0;
          for (let value of Object.values(num)) {
            total += Number(value)
          }

          this.unreadMsgTotal = total;
          this.$emit('msgPrompt', total)

        },
        deep: true
      },
      //打开聊天窗口默认固滑动到最下方
      showChat(bool) {
        if (bool) {
          //打开聊天框 清空当前未读消息提醒
          let _roomName = this.currentRoom._roomName;
          this.member.entity.rooms.forEach(el => {
            if (el._roomName === _roomName) {
              el.msgIndex = this.allRoom[_roomName].historyContent.length
            }
          });
          this.scrollDown();
        }

        this.$emit('msgPrompt', this.unreadMsgTotal)

      },

      //监听修改昵称是否打开
      perMenu(bool) {
        if (!bool) this.member.copyNickname = this.member.nickname
      }
    },
    computed: {
      //分页
      currentList() {
        let list = this.member.list;
        return list.slice((this.member.page - 1) * this.member.limit, this.member.limit * this.member.page);
      },

      //是否可以发送消息
      prohibit() {
        return this.sendOut === '发送'
      },


      /**
       * 当前房间权限列表
       * @cmd_showPersonNum  聊天室人数
       * @cmd_rightPanel     聊天室右侧面板
       * @hasAddMember       邀请成员加入聊天室
       * @hasAnExcuse        禁言
       * @handleMenu         操作成员菜单
       * @hasSendPlan        发布投注计划
       * @hasDeleteRoom      解散房间
       * @setAdmin           设置管理员
       */
      jurisdiction() {
        let roomtype = this.currentRoom.roomtype;  //当前房间类型 1基础房间 2自己新建房间 3其他新建房间
        let roomownertype = this.currentRoom.roomownertype;  //房间类型 0成员   1房主 2管理员 11大厅
        let customerCmd = this.$store.state.user.customerCmd;   //后台配置权限
        let isagent = Number(this.member.isagent) === 1;  //0会员 1vip
        let roleType = Number(this.member.roleType) === 1 && roomownertype === 11; //0成员 1管理员  大厅专用
        let owned = [];


        //角色 房主 或者 管理员
        let role = roomownertype === 1 || roomownertype === 2;

        //新建的房间
        let isBuilt = roomtype === 2 || roomtype === 3;

        let cmd = role || isBuilt || roleType;

        //处理右侧是否展示
        if (cmd) {
          this.shrink = !cmd;
        } else {
          this.shrink = Number(customerCmd.cmd_rightPanel) === 0
        }

        //是否显示聊天室人数
        if (cmd || Number(customerCmd.cmd_showPersonNum) === 1) {
          owned.push('cmd_showPersonNum')
        }

        //是否显示聊天室右侧面板
        if (cmd || Number(customerCmd.cmd_rightPanel) === 1) {
          owned.push('cmd_rightPanel')
        }

        //新建房间&& 管理员 ||房主 &&vip 邀请人员加入聊天室权限
        if (isBuilt && role && isagent) {
          owned.push('hasAddMember')
        }

        //房主和管理员
        if (role || roleType) {
          //基础房间之外的vip 有踢人和操作成员菜单按钮
          if (roomtype !== 1 && isagent) {
            owned.push('kickOut', 'handleMenu')
          }

          //除开大厅之外有禁言
          if (role) {
            owned.push('hasAnExcuse')
          }

          //都有发布计划
          owned.push('hasSendPlan')
        }

        //房主 基础房间之外
        if (roomownertype === 1 && roomtype !== 1) {
          //解散房间 设置管理员
          owned.push('hasDeleteRoom', 'setAdmin')
        }


        return owned

      },


      //在线成员排序
      sortMemberList() {
        let list = this.member.list;

        //房主 管理员 自己
        let role = list.filter(e => e.role < 99);

        //其他成员
        let member = list.filter(e => e.role === 99);


        role.sort((a, b) => {
          return a.role - b.role
        });

        member.sort((a, b) => {
          return b.online - a.online
        });

        return [...role, ...member];
      }
    },
    //自定义指令
    directives: {
      //移动聊天框
      drag: {
        inserted(el, binding) {
          let isMouseDown,
            initX,
            initY,
            dragBoxBar = el.firstElementChild;

          // el.onfocus = function () {
          //   document.body.style.height = '100vh'
          //
          //   document.body.style['overflow-y'] = 'hidden'
          // }
          // el.onblur = function () {
          //   document.body.style.height = 'auto'
          //
          //   document.body.style['overflow-y'] = 'auto'
          // }

          dragBoxBar.addEventListener('mousedown', function (e) {
            if (e.target.className.includes('not-move')) return false;
            isMouseDown = true;
            document.body.classList.add('no-select');
            el.lastElementChild.classList.add('pointer-events');
            initX = e.offsetX;
            initY = e.offsetY;
            el.style.opacity = 0.9;
          }, true);

          dragBoxBar.addEventListener('mouseup', function (event) {
            if (event.target.className.includes('not-move')) return false;
            mouseupHandler();
          });

          document.addEventListener('mousemove', function (e) {
            if (isMouseDown) {
              let cx = e.clientX - initX,
                cy = e.clientY - initY;
              if (cy < 0) {
                cy = 0;
              }
              if ((window.innerHeight - cy) < 100) {
                cy = window.innerHeight - 100
              }


              if ((window.innerWidth - cx) < 30) {
                cx = window.innerWidth - 30
              }

              if (cx < (-initX + 30)) {
                cx = -initX + 30
              }

              el.style.left = cx + 'px';
              el.style.top = cy + 'px';
            }
          });


          document.addEventListener('mouseup', function (e) {
            if (e.clientY > window.innerWidth || e.clientY < 0 || e.clientX < 0 || e.clientX > window.innerHeight) {
              mouseupHandler();
            }
          });

          function mouseupHandler() {
            isMouseDown = false;
            document.body.classList.remove('no-select');
            el.lastElementChild.classList.remove('pointer-events');
            el.style.opacity = 1;
          }
        },

      },
      //新开窗口打开img
      openImages: {
        bind(el, binding) {
          el.addEventListener('dblclick', (event) => {
            if (event.target.localName === 'img') {
              let imgUrl = event.target.src;
              let win = window.open();
              let img = "<div style='text-align: center'><img src=" + imgUrl + "></div>";
              win.document.open();
              win.document.write(img);
              win.document.close();
            }
          })
        }
      },
    },

    //销毁当前组件前 销毁富文本编辑 断开socket链接
    destroyed() {
      $('#summernote').summernote('destroy');
      this.closeChat();
      CHAT.logout()
    },

    methods: {
      //获取上传文件
      getFileImg() {
        let inputDOM = this.$refs.uploadImg;
        if (inputDOM.files && inputDOM.files.length > 0 && inputDOM.files[0].size > 0) {
          let file = inputDOM.files[0];
          if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
            layer.msg('对不起，只能上传PNG、JPG格式的图片！');
            return
          }
          if (file.size > 1024 * 1024) {
            layer.msg('图片不能超过1M');
            return
          }
          try {
            /*图片转Base64 核心代码*/
            if (typeof(FileReader) === 'undefined') {
              return layer.msg('抱歉，你的浏览器不支持 FileReader，不能将图片转换为Base64，请使用现代浏览器操作!')
            }
            let reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = function () {
              let img = new Image();
              img.src = this.result;
              img.style.width = '25%'

              //插入图片到富文本编辑器
              $('#summernote').summernote('insertNode', img);
            }

          } catch (e) {
            layer.msg('图片转Base64出错啦！' + e.toString())
          }
        }

        document.getElementById('uploadFormImg').reset()

      },

      //点击上传
      handleUploadImg() {
        document.getElementById("uploadFormImg").fileImg.click()
      },

      //关闭聊天框
      closeChat() {
        this.$emit('update:showChat', false)
      },

      //resize聊天框
      resizeChat() {
        this.resizeChatRoom = !this.resizeChatRoom;
        this.scrollDown()
      },

      //切换房间
      changeRoom(room) {
        if (this.currentRoom._roomName === room._roomName) return layer.msg('您已经在该房间');
        //if (room.roomAllow === 0) return layer.msg('您没有加入该房间的权限');

        //如果当前房间创建失败
        if (!this.allRoom[room._roomName]) {
          CHAT.joinRoom(room, this);
          return
        }
        room.msgIndex = this.allRoom[room._roomName].historyContent.length;

        this.currentRoom = room;
        this.hideAll();
        this.showRoom = false;
        this.scrollDown()

      },
      //选中房间
      activeRoom(name) {
        return name === this.currentRoom._roomName
      },

      //聊天区域滚动条到底部
      scrollDown() {
        this.$nextTick(() => {
          $('.chat-history').scrollTop($('.chat-history')[0].scrollHeight);
        })
      },

      //发送计划
      sendPlan(plan) {
        //console.log(plan)
        CHAT.sendMsg(plan, this)
          .then((data) => {
            this.allRoom[this.currentRoom._roomName].historyContent.push(data);

          })
          .catch((data) => {
            this.allRoom[this.currentRoom._roomName].historyContent.push(data);

          });

        this.showPlan = false;
      },

      //得到计划
      fetchPlan(event) {
        this.lottery = {};
        let dom = event.target;

        this.lottery.type = dom.getAttribute('data-type');
        this.lottery.typeId = dom.getAttribute('data-type-id');
        this.lottery.playGroup = dom.getAttribute('data-play-group');
        this.lottery.playType = dom.getAttribute('data-play-type');
        this.lottery.unitMode = dom.getAttribute('data-unit-mode');
        this.lottery.actionNum = dom.getAttribute('data-action-num');
        this.lottery.actionCode = dom.getAttribute('data-action-code');
        this.lottery.unitMenu = dom.getAttribute('data-unit-menu');
        this.lottery.titleName = dom.getAttribute('data-title-name');
        this.lottery.title = dom.getAttribute('data-title');
        this.lottery.name = dom.getAttribute('data-name');
        this.lottery.groupName = dom.getAttribute('data-group-name');
        this.lottery.actionNo = dom.getAttribute('data-action-no');

        for (let k in this.lottery) {
          if (!this.lottery[k]) return
        }

        // for (let key in dom.dataset) {
        //   this.lottery[key] = dom.dataset[key];
        // }

        this.showFastBet = true
      },

      //发送消息
      sendChatContent() {
        if (!this.prohibit) return layer.msg(`当前发言频率过快，离下次发言还有${this.intervalTime + 1}秒`);
        let msg = $('#summernote').summernote('code');
        let reg = /(<p><br><\/p>|<br>|<p><\/p>|style="width: 25%;")/g;
        msg = msg.replace(reg, '');
        CHAT.sendMsg(msg, this)
          .then((data) => {
            //添加到当前聊天区域
            this.allRoom[this.currentRoom._roomName].historyContent.push(data);

            //清除发送消息定时器 重置参数
            window.clearInterval(this.timerSendMsg);
            this.intervalTime = 3;
            this.sendOut = '发送';

            //开启定时器
            this.sendMsgInterval();
            this.timerSendMsg = setInterval(this.sendMsgInterval, 1000);


          })
          .catch((data) => {
            //添加到当前聊天区域
            this.allRoom[this.currentRoom._roomName].historyContent.push(data)
          })
      },

      //重新发送消息
      sendAgain(item, i) {
        layer.confirm('当前消息发送失败，是否重新发送?', (index) => {
          item.arrived = 2;
          CHAT.sendMsg(item.content, this)
            .then((data) => {
              item.arrived = 1;
              this.allRoom[this.currentRoom._roomName].historyContent.push(data);
              this.allRoom[this.currentRoom._roomName].historyContent.splice(i, 1)
            })
            .catch(() => {
              item.arrived = 0
            });
          layer.close(index)
        })
      },

      //发送消息间隔
      sendMsgInterval() {
        if (this.intervalTime <= 0) {
          window.clearInterval(this.timerSendMsg);
          this.intervalTime = 3;
          this.sendOut = '发送';
          return
        }
        this.sendOut = `${this.intervalTime}s`;
        this.intervalTime--
      },


      //点击表情
      handleEmoji() {
        this.showEmoji = !this.showEmoji;
      },

      //修改昵称
      changeNiceName(nikeName) {
        let params = {
          id: this.member.id,
          nikeName,
        };

        let reg = /[\u4E00-\u9FA5]/;
        if (!reg.test(nikeName)) {
          return layer.msg('昵称只能输入中文~');
        }

        if (nikeName.length > 4) {
          return layer.msg('昵称不能超过四位~')
        }


        CHAT.changeNickName(params)
          .then((data) => {
            this.perMenu = false;
            for (let value of Object.values(this.allRoom)) {
              //找到在线列表，替换名字
              value.member.list.forEach(el => {
                if (el.id === this.member.id) el.nickname = nikeName
              })
            }
            //改变内部存的值
            this.member.nickname = nikeName;

          })
          .catch(console.log)
      },

      //操作禁言
      handleAnExcuse(member) {
        if (this.currentRoom.roomownertype === 0) return;
        let params = {
          roomName: this.currentRoom.roomname,
          id: member.id,
          roomOwnerName: this.currentRoom.roomownername,
          isAnExcuse: member.anexcuse ? 0 : 1
        };
        /*操作禁言 正在请求过程中 突然切换房间需处理*/
        CHAT.roomAnExcuse(params)
          .then((data) => {
            this.allRoom[this.currentRoom._roomName].member.list.some((el) => {
              if (member.id === el.id) {
                el.anexcuse = params.isAnExcuse;
                this.anexcuse = params.isAnExcuse;
                return true
              }
              return false
            })
          })
          .catch(console.log)
      },

      //新消息提示
      newMsgPrompt(room) {

        let _roomName = room._roomName;
        //判断是否生成房间
        if (!this.allRoom[_roomName]) return false;

        let num = this.allRoom[_roomName].historyContent.length - room.msgIndex;

        if (num <= 0) num = 0;
        if (num > 99) num = '99+';

        //判断根对象是否存在当前房间 不存在的话使用set添加当前房间
        if (this.unreadMsgNum[_roomName]) {
          this.unreadMsgNum[_roomName] = num;
        } else {
          this.$set(this.unreadMsgNum, _roomName, num)
        }

        return num
      },

      //新建房间
      createRoom(addRoomName) {
        let reg = /[\u4E00-\u9FA5]/;
        if (!reg.test(addRoomName)) {
          return layer.msg('房间名只能输入中文~');
        }

        if (addRoomName.length > 5) {
          return layer.msg('房间名不能超过五位~')
        }

        CHAT.createRoom({roomName: addRoomName})
          .then(({data}) => {
            this.showAddRoom = false;
            this.addRoomName = '';

            //新增房间数组
            let _roomName = data.roomownername + data.roomname;
            data._roomName = _roomName;

            CHAT.joinRoom(data, this)

            //添加房间到列表
            this.member.entity.rooms.push(data);

            //
            //  this.$set(this.allRoom, _roomName, obj)
          })
          .catch(console.log)
      },

      //显示邀请成员弹框
      showAddMemberList() {
        if (!this.showAddMember) {
          let _roomName = '';
          //循环匹配基础房间得到房间名字


          this.member.entity.rooms.forEach(el => {
            if (el.roomtype === 1 && el.roomownertype === 1) {
              _roomName = el.roomownername + el.roomname
            }
          });

          //深拷贝赋值
          let memberList = JSON.parse(JSON.stringify(this.allRoom[_roomName].member.list));

          let list = this.allRoom[this.currentRoom._roomName].member.list;

          //处理数据 已邀请不在显示
          memberList = memberList.filter(el => {
            el.active = false;
            return !list.some(e => {
              return e.id === el.id
            })
          });

          this.memberList = memberList
        }

        this.showAddMember = !this.showAddMember
      },

      //邀请成员
      roomInvite() {
        let arr = [];
        this.memberList.forEach((el) => {
          if (el.active) arr.push(el.id)
        });

        if (arr.length < 1) {
          return layer.msg('请选择邀请的成员~')
        }

        let params = {
          roomName: this.currentRoom.roomname,
          roomOwnerName: this.currentRoom.roomownername,
          users: arr
        };

        CHAT.chatRoomInvite(params)
          .then((data) => {

            this.showAddMember = false;
          })
          .catch(console.info)
      },

      //踢出成员
      roomLeave(user) {
        let params = {
          roomName: this.currentRoom.roomname,
          roomOwnerName: this.currentRoom.roomownername,
          tagId: user.id,
        };

        CHAT.roomKickOut(params)
          .then(() => {
            user.showMenu = false;

          })
          .catch(() => {

          })
      },

      //修改成员为管理员
      roomAuthor(user) {
        if (this.currentRoom.roomownertype !== 1 || user.role === 1) return;
        let params = {
          uid: user.id,
          roomName: this.currentRoom.roomname,
          roomOwnerName: this.currentRoom.roomownername,
          roomOwnerType: user.room.roomownertype === 2 ? 0 : 2
        };
        CHAT.roomAuthorizationManager(params)
          .then((data) => {
            if (params.roomOwnerType === 0) {
              if (params.uid === this.member.id) {
                user.role = 3;
              } else {
                user.role = 99;
              }
              user.room.roomownertype = 0
            } else {
              user.role = 2;
              user.room.roomownertype = 2
            }

            user.showMenu = false;

          })
          .catch(() => {

          })

      },

      //解散房间
      deleteRoom() {
        layer.confirm(`确认解散当前房间?`, (index) => {
          let params = {
            roomName: this.currentRoom.roomname,
            roomOwnerName: this.currentRoom.roomownername
          };

          CHAT.roomDelete(params)
            .then(() => {
              this.hideAll()
            })
            .catch(console.log)
        })
      },

      //点击显示操作成员菜单
      showHandleMenu(item) {
        if (item.role === 1 || item.id === this.currentRoom.customerid || this.member.isagent === 0) return;
        if (this.jurisdiction.includes('handleMenu')) {
          item.showMenu = !item.showMenu;
        }
      },


      //隐藏弹框
      hideAll(s) {
        this.showRoomMenu = false;    //菜单面板
        this.showPlan = false;      //发布投注计划
        this.showAddRoom = false;   //新建房间
        this.perMenu = false;     //昵称
        this.showRoom = false;    //房间列表
        this.showEmoji = false;  //表情
        this.showAddMember = false;  //邀请成员弹框
        this.hideMemberMenu();

        if (s) this[s] = true
      },

      hideMemberMenu() {
        this.member.list.forEach(el => {
          el.showMenu = false
        })
      }

    },

    mounted() {
      //初始化富文本编辑器
      $("#summernote").summernote({
        placeholder: '请输入...',
        lang: "zh-CN",
        maxHeight: '77px',
        minHeight: '77px',
        dialogsFade: true,
        shortcuts: true,
        disableDragAndDrop: true,
        disableResizeEditor: true,
        toolbar: false,
      });
      $('.note-statusbar').hide();

      //聊天室base_url
      let cmd_serverUrl = this.$store.state.user.customerCmd.cmd_serverUrl;

      //初始化聊天室cmd_serverUrl
      let user = this.$store.state.user;
      CHAT.initChat(user.uid, USER_TYPE, 'test', 'ds', user.token, this, cmd_serverUrl);


      //初始化表情
      let unicode = '😃😄😁😆😅😂🤣☺️😊😇🙂🙃😉😌😍😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩😏😒😞😔😟😕🙁☹️😣😖😫😩😢😭😤😠😡🤬🤯😳😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲😴🤤😪😵🤐🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾🤲👐🙌👏🤝👍👎👊✊🤛🤜🤞✌️🤟🤘👌👈👉👆👇☝️✋🤚🖐️🖖👨👱🍺🥂🥃🍻🎤❤️🧡💛💚💙💜🖤💔❣️💕💞💓💗💖💘💝💟🐶🐱🐭🐹🐰🦊🐻';
      let emoji = emojione.unicodeToImage(unicode);
      $('.emoji').html(emoji).on('click', 'img', (e) => {
        $('#summernote').summernote('insertText', e.target.alt);
        this.showEmoji = false;
      });

    },

    filters: {
      //所有房间名字处理
      changeRoomOwner(own, room) {
        if (room.roomtype === 2 || room.roomtype === 3) return room.roomname;
        switch (own) {
          case 0:
          case 2:
            return '其他';
            break;
          case 1:
            return '我的';
            break;
          case 11:
            return '大厅';
            break;
        }
      },

      //所有房间类型提示
      titleTip(num) {
        switch (Number(num)) {
          case 0:
          case 2:
            return '其他聊天室';
            break;
          case 1:
            return '我的聊天室';
            break;
          case 11:
            return '大厅聊天室';
            break;
        }
      },

      //禁言提示
      anexcuseTitle(user) {
        if (user.role === 1) {
          return user.anexcuse ? '全体禁言' : '全体解禁'
        } else {
          return user.anexcuse ? '禁言' : '解禁'
        }
      },


    },
  }
</script>
<style>
  .note-editor {
    border: 1px solid #fff !important;
    user-select: text;

  }

  .chat-operator .chat-dco * {
    max-width: 100% !important;
    word-wrap: break-word;
    /*overflow: auto;*/
  }

  .side-left .note-toolbar {
    position: absolute !important;
    bottom: -42px;
    top: auto !important;
    height: 40px;
    background-color: transparent;
  }

  .emoji img {
    width: 24px;
    height: 24px;
    padding: 4px;
    box-sizing: content-box;
    cursor: pointer;
  }

  .emoji img:hover {
    background-color: #fff;
  }

</style>

<style scoped lang="stylus" type="text/stylus">

  .triangle-down
    display inline-block
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #fff;
    margin-left 5px
    cursor pointer

  .red-round
    background: #bf001a;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    position: absolute;
    top 18px
    right 23px

  .ava
    background url("./images/ava.png") no-repeat center

  .ava-1
    background url("./images/avatar-1.jpg") no-repeat center

  .ava-2
    background url("./images/avatar-2.jpg") no-repeat center

  .ava-3
    background url("./images/avatar-3.jpg") no-repeat center

  .ava-4
    background url("./images/avatar-4.jpg") no-repeat center

  .ava-5
    background url("./images/avatar-5.jpg") no-repeat center

  .ava-6
    background url("./images/avatar-6.jpg") no-repeat center

  .ava-7
    background url("./images/avatar-7.jpg") no-repeat center

  .ava-8
    background url("./images/avatar-8.jpg") no-repeat center

  .ava-9
    background url("./images/avatar-9.jpg") no-repeat center

  .ava-10
    background url("./images/avatar-10.jpg") no-repeat center

  .ava-11
    background url("./images/avatar-11.jpg") no-repeat center

  .ava-12
    background url("./images/avatar-12.jpg") no-repeat center

  .ava-13
    background url("./images/avatar-13.jpg") no-repeat center

  .ava-14
    background url("./images/avatar-14.jpg") no-repeat center

  .ava-15
    background url("./images/avatar-15.jpg") no-repeat center

  .ava-16
    background url("./images/avatar-16.jpg") no-repeat center

  .ava-17
    background url("./images/avatar-17.jpg") no-repeat center

  .ava-18
    background url("./images/avatar-18.jpg") no-repeat center

  .ava-19
    background url("./images/avatar-19.jpg") no-repeat center

  .ava-20
    background url("./images/avatar-20.jpg") no-repeat center

  .ava-21
    background url("./images/avatar-21.jpg") no-repeat center

  .ava-22
    background url("./images/avatar-22.jpg") no-repeat center

  .ava-23
    background url("./images/avatar-23.jpg") no-repeat center

  .ava-24
    background url("./images/avatar-24.jpg") no-repeat center

  .ava-25
    background url("./images/avatar-25.jpg") no-repeat center

  .ava-26
    background url("./images/avatar-26.jpg") no-repeat center

  .ava-27
    background url("./images/avatar-27.jpg") no-repeat center

  .grayscale
    filter grayscale(100%)

  .room-disable
    background-color: #c0c4cc !important
    cursor not-allowed !important
    color: #9ca0a8 !important

  .room-active
    background-color: #EC002C !important
    cursor not-allowed !important
    color: #fff !important
    .room-title-11
      background no-repeat url("./images/hill-h.png") center !important
    .room-title-1
      background no-repeat url("./images/self-h.png") center !important
    .room-title-0, .room-title-2
      background no-repeat url("./images/sj-h.png") center !important

  /*滚动条 start*/
  ::-webkit-scrollbar {
    width: 7px;
    height: 4px;
    background-color: #F5F5F5;
  }

  /*定义滚动条轨道 内阴影+圆角*/
  ::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background: #fff;
  }

  /*定义滑块 内阴影+圆角*/
  ::-webkit-scrollbar-thumb {
    border-radius: 3px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, .3);
    background-color: rgba(158, 158, 158, 0.7);
  }

  ::-webkit-scrollbar-thumb:hover {
    border-radius: 3px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, .3);
    background-color: rgba(158, 158, 158, 1);
  }

  .group-chat-header
    display flex
    height 58px
    cursor move
    .menu-wrapper
      position absolute
      top 67px
      width 104px
      z-index 12
      left 9px
      background-color #eb022c
      &:after
        border: 6px solid transparent;
        border-bottom-color: #eb022c;
        top: -12px;
        content: ' ';
        height: 0;
        left: 14px;
        position: absolute;
        display: block;
        width: 0;
      i
        display inline-block
        width 100%
        height 30px
        text-align center
        line-height: 30px
        color: #ffffff
        font-size 12px
        cursor pointer
        & + i
          border-top 1px solid #ff5272
    /* .member-menu
       background no-repeat url("./images/geren.png") 6px 6px
       &:hover
         background no-repeat url("./images/geren-h.png")  6px 6px
     .create-room-menu
       background no-repeat url("./images/add-room.png") 6px 6px
       &:hover
         background no-repeat url("./images/add-room-hover.png") 6px 6px*/
    .i
      display inline-block
      position absolute
      top 0
      z-index 1
      cursor context-menu
      transition background .3s
      height 58px
      width 58px
    .close-chat
      @extend  .group-chat-header .i
      right 0
      background no-repeat url("./images/close-chat.png") center
      border-left 1px solid #32375d
      &:hover
        background no-repeat url("./images/close-chat-hover.png") center
    .resize-chat
      @extend  .group-chat-header .i
      right 58px
      background no-repeat url("./images/enlarge.png") center
      border-left 1px solid #32375d
      &:hover
        background no-repeat url("./images/enlarge-hover.png") center

    .narrow
      background no-repeat url("./images/narrow.png") center
      &:hover
        background no-repeat url("./images/narrow-hover.png") center

    .room-handle-menu
      @extend  .group-chat-header .i
      background no-repeat url("./images/menu.png") center
      left 0
      border-right 1px solid #32375d

    .group-chat-room
      width 100%
      text-align center
      color: #fff
      font-size 14px
      height 58px
      line-height 58px
      background-color #282d4f
      position relative
      .room-title
        display inline-block
        height 100%
      .msg-prompt
        background #EC002C
        position absolute
        border-radius 2px
        transition all .3s
        padding 0 2px
        font-weight 100
        top -6px
        right 4px
        width 20px
        text-align center
        color: #ffffff
        font-size 12px
        transform scale(.9)
        line-height 12px

      .room-dropdown
        transition: all 0.5s;
        transform: translateY(-58px);
        opacity: 0;
        visibility hidden
        position absolute
        top 58px
        left 0
        right 0
        padding 19px 0 0 61px
        font-size: 12px
        z-index -1
        cursor context-menu
        background-color #715acf
        max-height: 216px
        overflow auto
        &:after
          display: block;
          content: "";
          clear: both;
          height: 0;
          visibility: hidden;
        .c-room
          background-color #fff
          line-height 30px
          text-align center
          width 118px
          float left
          height 30px
          color: #715acf
          z-index 1
          box-shadow 0 3px 4px rgba(68, 68, 68, .5)
          cursor pointer
          margin 0 20px 20px 0
          transition all .3s
          position: relative;
          .room-title-11
            display inline-block
            width: 10px
            height: 10px
            position absolute
            left 10px
            top 10px
            background no-repeat url("./images/hill.png") center
          .room-title-1
            display inline-block
            width: 10px
            height: 10px
            position absolute
            left 10px
            top 10px
            background no-repeat url("./images/self.png") center
          .room-title-0, .room-title-2
            display inline-block
            width: 10px
            height: 10px
            position absolute
            left 10px
            top 10px
            background no-repeat url("./images/sj.png") center
          &:hover
            color: #fff
            background-color #EC002C
            .msg-prompt
              background-color #ffffff
              color: #EC002C
            .room-title-11
              background no-repeat url("./images/hill-h.png") center
            .room-title-1
              background no-repeat url("./images/self-h.png") center
            .room-title-0, .room-title-2
              background no-repeat url("./images/sj-h.png") center

  .show-drop
    visibility visible !important
    opacity: 1 !important
    z-index 11 !important
    transform: translateY(0) !important

  .group-chat-body
    height 620px
    display flex
    position relative
    .add-room-shade
      position absolute
      left: 0
      right: 0
      top: 0
      bottom: 0
      opacity .5
      z-index 3
      background-color #282d4f
    .add-room-content
      .add-room-main
        background-color #fff
        position absolute
        z-index 4
        top 50%
        left 50%
        margin -100px 0 0 -170px
        width: 296px
        padding 26px 22px 24px
        input
          height: 42px
          color: #333
          font-size: 14px
          width 262px
          padding 0 15px
        .button
          margin-top 20px
          width 296px

    .add-room-member
      .add-member-main
        background-color #fff
        position absolute
        z-index 4
        top 50%
        left 50%
        box-sizing content-box
        margin -100px 0 0 -170px
        width: 296px
        padding 16px 22px 24px
        ul
          height 64px
          overflow auto
          li
            cursor pointer
            color: #ffffff
            line-height: 20px
            text-align center
            border-radius 10px
            padding 0 10px
            display inline-block
            background-color #aaaaaa
            height: 20px
            margin 12px 6px 0 0
            transition background-color .3s
            &:hover
              background-color #118bfe
          .active
            background-color #118bfe

        p
          margin-bottom 10px
          color: #999
          font-size: 14px
        .button
          margin-top 20px
          width 296px

    .per-info-shade
      position absolute
      left 0
      right: 0
      top: 0
      bottom: 0
      background-color #282d4f
      opacity .5
    .per-info
      height 160px
      width: 340px
      position absolute
      left 50%
      top 50%
      z-index 4
      background-color #fff
      margin -100px 0 0 -170px
      .ava-img
        position absolute
        top -84px
      .per-avatar
        width 68px
        height: 68px
        border-radius 50%
        background-color #ffffff
        position absolute
        padding 6px
        z-index 1
        top -40px
        left 130px
        overflow hidden
        div
          border-radius 50%
          background-size cover
          width 100%
          height: 100%
      .per-input
        margin-top 52px
        text-decoration: underline;
        border 0
        font-size: 16px
        color: #333
        font-weight bold
        text-align center
        padding 0 10px
        width 320px
      .per-submit
        position absolute
        bottom: 20px
        left 30px
        width: 280px
        cursor pointer
        height 39px
        text-align center
        line-height: 39px
        font-size: 14px

  .side-bar-r
    float left
    height 100%
    position relative
    min-width 1px

  .group-chat
    position fixed
    background-color #fff
    right 110px
    top 150px
    z-index 1049
    width: 930px
    height 678px
    box-shadow 0 3px 5px rgba(68, 68, 68, 0.9)
    /*resize: both;*/
    user-select none
    max-width 930px
    max-height 698px
    min-width 350px
    /*overflow: auto;*/
    .member-avatar
      position: relative;
      margin 0 auto
      height 34px
      overflow hidden
      width 34px
      border-radius 50%
      .avatar
        width 34px
        height 34px

    .member-name
      font-size 12px
      margin 6px 0 0
      text-align center
      height 12px
      line-height 12px
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #999
      span
        position relative
        img
          width 12px
          left -14px
          position absolute

    .member-name-1
      color: #ff9a17
    .member-name-2
      color: #7e5acf
    .side-left
      position relative
      width: 660px
      height 100%
      background-color #fff

      .chat-history
        height: 459px
        padding-top 26px
        overflow-y auto
        position relative

        .chat-tip
          padding-top: 20px;
          font-size: 12px;
          color: #ccc;
          text-align: center;
        .chat-operator
          width 70%
          margin-top 36px
          display flex
          box-sizing content-box
          .chat-warning
            height: 14px
            width: 14px
            margin 0 5px
            cursor pointer
          .member-info
            width: 88px
            .member-avatar
              margin 0 24px 0 30px
          .chat-bubble
            border-radius 3px
            max-width 345px
            background-color #0083fe
            padding 5px 12px
            position relative
            &:after
              border: 6px solid transparent;
              content: ' ';
              position: absolute;
              display: block;
              width: 0;
              height: 0;
              border-right-color: #0083fe;
              top: 12px;
              left -12px
            //根据三角的位置改变
            .chat-dco
              color: #fff
              font-size 14px
              line-height: 24px;
              word-wrap: break-word;
              width 100%
            .chat-name
              top -16px
              left 0
              right 0
              position absolute
              font-size 12px
              height 12px
              line-height 1
              color: #999
              width 200px
        .chat-self
          flex-direction: row-reverse;
          padding-right 0
          padding-left 30%
          .member-avatar
            margin 0 30px 0 24px !important
          .chat-bubble
            background-color #ec002c
            .chat-name
              right 0
              left auto
              text-align right
            &:after
              border-width: 6px;
              border-left-color: #ec002c;
              top: 12px;
              right -12px
              left auto
              border-right-color: transparent;

      .chat-entry
        background-color #dfedfb
        position absolute
        left 0
        right 0
        height 127px
        padding 8px 8px 0 8px
        bottom 0
        .enter-btn
          height 30px
          width 80px
          border 0
          user-select none
          border-radius 3px
          background-color #0083fe
          color: #ffffff
          font-size 14px
          display inline-block
          line-height 30px
          text-align center
          cursor pointer
          float right
          margin 9px 30px 0 0
          &:hover
            background-color #2fa0ec
    .side-bar-icon
      position absolute
      left -13px
      width 13px
      top 50%
      height: 60px
      margin-top -30px
      display inline-block
      transition background .3s
      background no-repeat url("./images/side-bar-hover.png")
      z-index 3
      &:hover
        background no-repeat url("./images/side-bar.png")
    .side-right
      background-color #e2eef7
      width 270px
      min-width 200px
      color: #999
      text-align center
      position relative
      font-size 14px
      .member-content
        height 620px
        .member-wrapper
          padding-top 20px
          /*display flex*/
          /*flex-wrap wrap*/
          height 600px
          overflow-y auto
          li
            position relative
            width 33.33%
            margin-bottom 24px
            float left
            .more-menu
              position absolute
              right 11px
              width 9px
              height: 4px
              bottom 4px
              background center no-repeat url("./images/more.png")
            .more-menu-active
              background center no-repeat url("./images/more-h.png")
            .handle-menu
              border-radius 2px
              z-index 3
              position absolute
              width 100%
              background-color #eb022c
              span
                display inline-block
                height: 30px
                width 100%
                cursor pointer
                float left
                line-height: 30px
                text-align center
                color: #ffffff
                font-size 12px
                transition all .2s
                & + span
                  border-top 1px solid #ff5272
            .add-member
              background no-repeat url("./images/add-ava.png") center
              border 1px solid #2fa0ec
              border-radius 50%
              width: 34px
              height: 34px
              margin 0 auto
              cursor pointer
            .avatar-shade
              position absolute
              top 0
              right 0
              bottom 0
              left 0
              display flex
              justify-content center
              align-items center
              span
                display inline-block
                width 100%
                height 100%

              .unan-excuse
                background no-repeat url("./images/unanexcuse.png") center
                background-color rgba(0, 0, 0, .8)
                visibility visible
                opacity: 0;
              .an-excuse
                background no-repeat url("./images/anexcuse.png") center
                background-color rgba(0, 0, 0, .8)

            .member-avatar:hover
              .unan-excuse
                visibility visible
                opacity .8
        .member-pagination
          bottom 0
          position absolute
          left 0
          right 0
          height: 59px
          padding-top 8px

  #fileImg
    outline: none;
    opacity: 0;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 115px;
    height: 30px;
    z-index: -1;
    background: #000;
    cursor: pointer;

  .up-form
    height 48px
    position relative
    i
      transition background .3s
      cursor pointer
      padding 5px
      display inline-block
      height: 18px
      margin 10px 0 0 15px
      width: 18px
      &:hover
        background-color #fff
    .active-emoji
      background-color #fff !important
    .up-picture
      background no-repeat url("./images/img.png") center
    .up-countenance
      background no-repeat url("./images/countenance.png") center
    .emoji
      position absolute
      left -8px
      right -8px
      bottom 48px
      height 258px
      overflow auto
      background-color #dfedfb
      display flex
      flex-wrap wrap
      justify-content center
      padding 5px 0
      box-sizing content-box

  .side-right-hide
    max-width 660px
    .side-right
      display none

  .mini-room
    width 350px !important
    height: 440px
    .up-form
      height 28px
      i
        height 20px
        padding 1px 5px
        margin-left 10px
        margin-top 3px
      .emoji
        bottom 28px
    .enter-btn
      height 20px !important
      width: 60px !important
      line-height 20px !important
      margin 4px 20px 0 0 !important
      font-size 12px !important

    .group-chat-header, .group-chat-room
      height 40px
      line-height 40px
      .room-dropdown
        padding-left 47px
        transform translateY(-40px)
        top 40px
    .room-handle-menu
      height 40px
    .menu-wrapper
      top 49px
      line-height 1
    .side-bar-r
      display none
    .group-chat-body
      height: 400px
    .side-left .chat-history
      height 259px
    .chat-entry
      height 107px !important
    .side-right
      display none
    .resize-chat, .close-chat
      width 40px
      height 40px
    .resize-chat
      right 40px
    .side-left
      width 350px
    .side-left
      .chat-history
        .chat-operator
          .chat-bubble
            max-width 160px
          .member-info
            width 56px !important
            .member-avatar
              height 28px
              width: 28px
              margin 0 15px 0 13px !important

  @media (max-width: 950px)
    .group-chat
      width 660px
      .side-right
        display none

  @media (max-width: 670px)
    .group-chat
      display none

  @media (max-height: 770px)
    .group-chat
      width 350px !important
      height: 440px
      .up-form
        height 28px
        i
          height 20px
          padding 1px 5px
          margin-left 10px
          margin-top 3px
        .emoji
          bottom 28px
      .enter-btn
        height 20px !important
        width: 60px !important
        line-height 20px !important
        margin 4px 20px 0 0 !important
        font-size 12px !important

      .group-chat-header, .group-chat-room
        height 40px
        line-height 40px
        .room-dropdown
          padding-left 47px
          transform translateY(-40px)
          top 40px
      .room-handle-menu
        height 40px
      .menu-wrapper
        top 49px
        line-height 1
      .side-bar-r
        display none
      .group-chat-body
        height: 400px
      .side-left .chat-history
        height 259px
      .chat-entry
        height 107px !important
      .side-right
        display none
      .resize-chat, .close-chat
        width 40px
        height 40px
      .resize-chat
        display none
      .side-left
        width 350px
      .side-left
        .chat-history
          .chat-operator
            .chat-bubble
              max-width 160px
            .member-info
              width 56px !important
              .member-avatar
                height 28px
                width: 28px
                margin 0 15px 0 13px !important

</style>
