import { ProjectData, SCHEMA_VERSION } from './schema'

/**
 * 内置示例项目：一首虚构原创歌词《夜色信号》，主题=城市夜景中的少女。
 * 提供完整的两步产物，让首次启动的用户无需配置 AI / CLI 就能看到完整效果。
 *
 * - step1: 已填好歌词、元素、3 个完整定妆照方案（含可直接复制的 MJ 风格 ai_image_prompt）
 * - step2: 已填好 12 条分镜，每条都含 shot_size/angle/camera_movement/perspective/scene_description/lyric
 * - 不含 characterRefs/costumeRefs（用占位文案告诉用户：示例不需要上传图）
 */
export function buildDemoProjectData(id: string, name = 'MV Studio · 示例项目《夜色信号》'): ProjectData {
  const now = new Date().toISOString()
  return {
    meta: {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION
    },
    step1: {
      lyrics: `霓虹下我数着雨滴
路灯把影子拉很长
你给的耳机还在循环
那年夏天的副歌

地铁穿过夜的胸口
我把秘密折成船
风一吹就漂到很远
远到再也想不起

如果时间能倒带
我想停在那个夏天
你笑得像汽水
我装作毫不在意`,
      mood: '都市怀旧 · 青春淡淡的遗憾感 · 夜色冷冽中的暖色记忆',
      elements: ['夜晚都市', '雨夜', '霓虹灯', '地铁站', '复古耳机', '便利店', '夏天回忆', '青春感'],
      characterRefs: [],
      faceAnalysis: {
        face_shape: '清秀鹅蛋脸',
        skin_tone: '冷白皮 · 通透感',
        temperament_tags: ['少女感', '文艺青年', '清冷', '故事感']
      },
      concepts: [
        {
          id: 1,
          theme_name: '霓虹夜雨',
          style_direction: '王家卫式 · 都市夜雨 · 暖色霓虹与冷调街道的反差',
          makeup: '裸色雾面唇 + 极淡眼影 + 微微泛红眼眶 + 透明感底妆，强调湿润感',
          hairstyle: '齐肩黑长直发，发尾自然内扣，被夜雨打湿后贴在脸颊侧的几缕碎发',
          outfit: '宽松浅卡其色风衣（中长款），内搭白色简约高领针织衫，黑色直筒牛仔裤，黑色马丁靴',
          accessories: '复古银色金属链耳机（线缆垂落），透明伞柄长柄伞（半开），帆布单肩包',
          scene_atmosphere: '深夜便利店门口的人行道，雨后湿润的柏油马路，霓虹招牌倒映在水洼中',
          color_palette: ['霓虹粉', '电子蓝', '柏油黑', '路灯暖黄', '冷白霓虹绿'],
          overall_description: '湿润夜色中的孤独少女，王家卫式镜头美学，霓虹色彩在湿地面上晕开',
          ai_image_prompt: '电影截图，王家卫电影美学，深夜便利店外人行道，少女站在湿润的柏油马路上，鹅蛋脸清秀，冷白通透肌肤，齐肩黑长直发被夜雨打湿，几缕碎发贴在脸颊，穿宽松浅卡其色中长风衣，内搭白色高领针织衫，黑色直筒牛仔裤，黑色马丁靴，戴复古银色金属链耳机线缆垂落胸前，手持透明伞柄长柄伞半开，霓虹招牌的粉蓝绿在湿地面上晕开倒影，路灯暖黄逆光勾边发丝，对焦模糊，强烈的胶片颗粒感，暗调，低光氛围，浅景深，浪漫又孤独，写意风格，弥散晕染，朦胧美学，色溢效果，漏光感，故事性强，电影感构图，写实油画质感，极致细节，超高清，杰作'
        },
        {
          id: 2,
          theme_name: '地铁折影',
          style_direction: '日系城市青春电影 · 冷调晨昏 · 末班车的失落感',
          makeup: '极简自然妆，干净清透底妆，唇色稍带樱花粉，眼下点一颗小小卧蚕高光',
          hairstyle: '低马尾束起，留齐刘海覆眉，鬓发微微凌乱',
          outfit: '白色 oversize 短袖 T 恤（hello kitty 风格图案）+ 高腰黑色百褶半身裙 + 白色长袜 + 白色 NB 复古运动鞋',
          accessories: '透明亚克力小耳钉，手腕系一条蓝色细细丝带，胸前挂校园挂件',
          scene_atmosphere: '末班地铁车厢内部，靠窗座位旁，车厢外是飞速掠过的隧道灯带',
          color_palette: ['冷白', '墨黑', '樱花粉', '电子蓝', '霓虹紫'],
          overall_description: '末班地铁里的清冷少女，隧道灯带在窗玻璃上拖出长长光斑',
          ai_image_prompt: '电影写真，日系城市青春电影美学，末班地铁车厢内，靠窗座位上一位清秀少女侧坐，鹅蛋脸冷白皮，齐眉刘海低马尾，少女感十足，穿白色 oversize 短袖 T 恤胸前印图案，高腰黑色百褶半身裙，白色及膝长袜，白色复古运动鞋，透明亚克力耳钉，腕上系蓝色细丝带，目光透过车窗望向远方，车厢外隧道灯带拖出长长光斑划过玻璃，车厢内冷调日光灯映照，发丝边缘泛出微弱反光，对焦模糊柔和，颗粒胶片质感，浅景深聚焦少女面部，蓝紫色调与樱花粉的冲突，孤独感与故事感，王家卫式构图，暗调干净，朦胧诗意，弥散光斑，写意美学，超清细节，毛孔可见，杰作'
        },
        {
          id: 3,
          theme_name: '便利店暖光',
          style_direction: '复古胶片 · 黄绿暖光 · 90 年代港片少女回望',
          makeup: '90 年代复古妆容，珊瑚色腮红横扫颧骨，棕红色雾面唇，眼线微微上扬',
          hairstyle: '中长卷发，发尾微微外翘，刘海中分，发丝蓬松有空气感',
          outfit: '宽松米白色针织毛衣（V 领露锁骨），格纹高腰短裙，黑色丝袜，黑色玛丽珍鞋',
          accessories: '金属圆框眼镜（半框），细金链短项链，复古磁带 Walkman 别在腰间',
          scene_atmosphere: '24h 便利店内部，靠饮料冷柜，柜台日光灯偏黄绿色，门外可见雨夜霓虹',
          color_palette: ['暖黄绿', '复古卡其', '砖红', '米白', '墨绿冷柜光'],
          overall_description: '便利店暖黄光下的复古少女，90 年代港片质感，回头凝视镜头',
          ai_image_prompt: '复古胶片摄影，90 年代港片美学，24h 便利店内部场景，靠饮料冷柜处一位清秀少女回头凝视镜头，鹅蛋脸冷白皮，中长卷发发尾外翘，中分刘海蓬松空气感，复古珊瑚腮红横扫，棕红雾面唇，眼线微微上扬，戴金属半框圆眼镜，穿宽松米白 V 领针织毛衣，格纹高腰短裙，黑色丝袜，黑色玛丽珍鞋，颈间细金链，腰间别复古磁带 Walkman，便利店日光灯偏暖黄绿色调，门外可见雨夜霓虹模糊背景，胶片颗粒明显，暖黄绿与砖红的冲撞色调，对焦模糊，浅景深聚焦面部表情，故事性强，王家卫式构图，复古滤镜，明显的颗粒质感，漏光效果，超现实主义美学，电影感，极致细节，超高清，大师杰作'
        }
      ],
      selectedConceptId: 1
    },
    step2: {
      costumeRefs: [],
      storyboards: [
        {
          index: 1,
          lyric: '霓虹下我数着雨滴',
          shot_size: '近景',
          angle: '过肩',
          camera_movement: '缓慢推近',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女站在便利店外，背对镜头微微侧脸，伸手感受落下的雨滴，背景霓虹招牌虚化成五彩光斑'
        },
        {
          index: 2,
          lyric: '路灯把影子拉很长',
          shot_size: '全景',
          angle: '侧拍',
          camera_movement: '侧向匀速跟拍',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女沿着空旷人行道缓慢行走，路灯把她的影子在湿地面上拉得很长，远处隐约可见城市轮廓'
        },
        {
          index: 3,
          lyric: '你给的耳机还在循环',
          shot_size: '特写',
          angle: '平视',
          camera_movement: '固定机位',
          perspective: '第三人称视角',
          ref_images: ['人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '复古银色金属链耳机的特写，耳机线缆贴着颈侧垂落，少女低垂的睫毛在脸颊投下淡淡阴影'
        },
        {
          index: 4,
          lyric: '那年夏天的副歌',
          shot_size: '中景',
          angle: '仰拍',
          camera_movement: '希区柯克变焦',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女仰头望向夜空中飞掠的飞机闪光，眼神迷茫怀念，雨水沿脸颊滑落'
        },
        {
          index: 5,
          lyric: '地铁穿过夜的胸口',
          shot_size: '全景',
          angle: '俯拍',
          camera_movement: '推',
          perspective: '上帝视角',
          ref_images: ['服装场景参考图1'],
          audio_ref: '演唱音频1',
          scene_description: '从地铁站顶部俯视，少女独自站在站台等末班车，前方是黑黝黝的隧道入口'
        },
        {
          index: 6,
          lyric: '我把秘密折成船',
          shot_size: '特写',
          angle: '俯拍',
          camera_movement: '固定机位',
          perspective: '第一人称视角',
          ref_images: ['人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女手中正在折一艘小小的纸船，纸张上印着模糊的歌词，指尖动作轻柔缓慢'
        },
        {
          index: 7,
          lyric: '风一吹就漂到很远',
          shot_size: '中景',
          angle: '侧拍',
          camera_movement: '环绕',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女蹲在路边水洼旁，把折好的纸船放在水面上，纸船随风慢慢飘走，镜头围绕她环绕半圈'
        },
        {
          index: 8,
          lyric: '远到再也想不起',
          shot_size: '大特写',
          angle: '平视',
          camera_movement: '缓慢推近',
          perspective: '第三人称视角',
          ref_images: ['人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '少女眼睛的大特写，瞳孔倒映着远去的纸船和模糊的城市灯火，一滴泪水即将滑落'
        },
        {
          index: 9,
          lyric: '如果时间能倒带',
          shot_size: '中景',
          angle: '背拍',
          camera_movement: '甩镜',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '镜头从少女背影甩向便利店玻璃窗，窗内灯光温暖，玻璃倒影里隐约出现夏天的画面'
        },
        {
          index: 10,
          lyric: '我想停在那个夏天',
          shot_size: '全景',
          angle: '平视',
          camera_movement: '一镜到底',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '场景从夜雨城市平移过渡到夏日海边，少女转身面对镜头微笑，画面色调从冷蓝渐变为暖橙黄'
        },
        {
          index: 11,
          lyric: '你笑得像汽水',
          shot_size: '近景',
          angle: '过肩',
          camera_movement: '手持跟随',
          perspective: '第一人称视角',
          ref_images: ['人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '夏日阳光下少女回眸笑，手中握着汽水瓶，气泡在阳光中折射出彩虹光斑'
        },
        {
          index: 12,
          lyric: '我装作毫不在意',
          shot_size: '中景',
          angle: '侧拍',
          camera_movement: '拉',
          perspective: '第三人称视角',
          ref_images: ['服装场景参考图1', '人物参考图2'],
          audio_ref: '演唱音频1',
          scene_description: '镜头拉远，少女独自靠在便利店外柱子上，故作平静地喝着汽水，画面定格在落寞的微笑'
        }
      ]
    }
  }
}
