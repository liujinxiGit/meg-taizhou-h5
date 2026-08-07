(function(){
  var u=window.MEG_UTILS,results=[];
  function test(name,fn){try{fn();results.push({name:name,ok:true});}catch(e){results.push({name:name,ok:false,error:e.message});}}
  function equal(actual,expected){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error("期望 "+JSON.stringify(expected)+"，实际 "+JSON.stringify(actual));}
  test("URL source 参数解析",function(){equal(u.parseSource("?source=community-a"),"community-a");equal(u.parseSource(""),"direct");});
  test("微信话术生成",function(){equal(u.generateMessage({message:"测试话术"}),"测试话术");});
  test("预约服务映射",function(){equal(u.mapLeadService("open-gym"),"open_gym");equal(u.mapLeadService("pilates"),"reformer_pilates");equal(u.mapLeadService("boxing"),"boxing");});
  test("中英文预约编号话术",function(){equal(u.buildBookingMessage("你好，想预约。","TZ-260804-A7K3","zh-CN"),"你好，想预约。\n\n预约编号：TZ-260804-A7K3\n\n请问最近可以预约什么时间？");equal(u.buildBookingMessage("Hi, I would like to book.","TZ-260804-A7K3","en"),"Hi, I would like to book.\n\nBooking reference: TZ-260804-A7K3\n\nCould you let me know the available times?");});
  test("活动是否截止判断",function(){equal(u.isExpired("2026-09-30T23:00:00+08:00","2026-10-01T00:00:00+08:00"),true);equal(u.isExpired("2026-09-30T23:00:00+08:00","2026-09-01T00:00:00+08:00"),false);});
  test("体验项目选择",function(){equal(u.selectExperience([{id:"a"},{id:"b"}],"b"),{id:"b"});equal(u.selectExperience([],"b"),null);});
  test("事件对象生成",function(){equal(u.createEvent("copy_message","street","2026-01-01T00:00:00.000Z","en"),{event:"copy_message",source:"street",timestamp:"2026-01-01T00:00:00.000Z",page:"taizhou-opening",language:"en"});});
  test("localStorage 数据序列化",function(){equal(u.serializeStorage([{event:"page_view"}]),'[{"event":"page_view"}]');});
  test("规则展开状态",function(){equal(u.rulesExpanded(false),true);equal(u.rulesExpanded(true),false);});
  test("图片缺失 fallback",function(){var box=document.createElement("div"),img=document.createElement("img");box.appendChild(img);equal(u.imageFallback(img),true);equal(box.classList.contains("is-fallback"),true);});
  test("图片三级加载策略",function(){equal(u.imageLoadingPlan("hero",0,true).tier,"critical");equal(u.imageLoadingPlan("space",0,true).tier,"near");equal(u.imageLoadingPlan("folded-gallery",0,false).tier,"deferred");equal(u.imageLoadingPlan("later",0,true).tier,"later");});
  var passed=results.filter(function(x){return x.ok;}).length;document.getElementById("summary").textContent=passed+" / "+results.length+" 项通过";document.getElementById("summary").className=passed===results.length?"pass":"fail";document.getElementById("results").innerHTML=results.map(function(x){return '<li class="'+(x.ok?'pass':'fail')+'">'+(x.ok?'✓ ':'✗ ')+x.name+(x.error?'：'+x.error:'')+'</li>';}).join('');
})();
