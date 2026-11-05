# Rules for using the lead list / 使用名单的规则

> Plain-language guidance, not legal advice. If you plan anything bigger than a personal, small-scale list, ask a Malaysian lawyer.
> 这是通俗说明，不是法律意见。如果规模超过个人小量使用，请咨询马来西亚律师。

---

## English

### 1. Where this data comes from, and why to keep it small

- The list is pulled from public Google Maps listings with an open-source scraper. **Google's Terms of Service restrict automated scraping** of Google Maps. Running it can get your IP address temporarily blocked or shown CAPTCHAs, and Google can act against accounts that break its terms.
- So: **run it rarely (once, maybe a refresh in a few months), keep `-depth 1`, don't use proxies to get around blocks, and keep the result for your own personal use.**
- **Never sell, publish, or share the raw list** (not on GitHub, not in a group chat, not to "partners"). Keep `results.csv` and `leads.csv` off Git and out of shared folders.

### 2. Malaysia's PDPA still applies to "business" data

- Many Penang shops are **sole proprietors or partnerships**. Their shop phone is often the owner's personal mobile, and an email like `ahseng@gmail.com` identifies a person. Under the **Personal Data Protection Act 2010** (as amended in 2024), that is **personal data** when you use it for commercial purposes such as selling to them.
- What that means in practice:
  - **Purpose:** use it only to offer your retail product/service to these shops.
  - **Minimum:** keep only the columns in `leads.csv`. Do not add owners' IC numbers, home addresses, family details, or anything from their personal social media.
  - **Security:** keep the file on your own laptop or a private Google Sheet. Don't email it around.
  - **Retention:** delete rows for shops that said no, and delete the whole file when the campaign is over (for example after 6–12 months).
  - **Right to object to direct marketing:** if anyone says "stop" or "don't contact me", mark `status` as `do-not-contact` **the same day** and never contact them again.
  - Since the 2024 amendments, penalties are higher (fines up to RM1 million) and data breaches must be reported, so treat the file carefully.

### 3. Good uses ✅

| Use | How |
|---|---|
| **Market sizing** | Count shops by `segment` and `area` to see how big each market is in Penang. No contact needed. |
| **Ad targeting** | Use areas and segments to choose where to aim Facebook/Google ads (for example a radius around Gurney or Seberang Jaya). **Do not upload the phone numbers or emails as a "custom audience"**: those people never agreed to it. |
| **Walk-in visits** | Sort by `priority`, group by `area`, and plan a route. Walk in, introduce yourself, leave a flyer or card. Ask before taking the owner's personal number. This is the best channel for small shops. |
| **Warm intros** | Fill in `brother-knows`. Ask your brother (or a friend, supplier, or accountant) to introduce you first, then follow up only if the owner agrees. |
| **Emailing public business emails** | Only an address the shop publishes on its own website or listing (`email` column). Send **one** personal, relevant email per shop (not a mass blast), with your real name, business name and contact details, and an easy opt-out line, for example: *"If you'd rather not hear from me, just reply 'stop' and I won't email again."* Honour it immediately. Max one polite follow-up. |

### 4. Never do this ❌

- **Never cold WhatsApp-blast the phone numbers.** WhatsApp's Business and Commerce policies only allow messaging people who agreed to it first. Bulk unsolicited messages get your number **banned**, often within hours, and in Malaysia they are unsolicited direct marketing to personal data under the PDPA.
- No bulk SMS, no auto-dialers, no robocalls, no adding people to WhatsApp/Telegram groups.
- Don't scrape owners' personal Facebook/Instagram profiles to "enrich" the list.
- Don't pretend you were referred by someone when you weren't.
- Don't keep contacting someone who said no.

**A WhatsApp message is fine only when the owner gave you the number for that purpose**: for example, at a walk-in they said "WhatsApp me the details", or a warm intro where they agreed to be contacted.

---

## 中文

### 1. 数据来源，以及为什么要“少量”

- 名单来自 Google 地图上的公开商家资料，用开源爬虫工具抓取。**Google 的服务条款限制对 Google 地图进行自动抓取。** 运行时你的 IP 可能会被暂时封锁或要求验证码，Google 也可能对违反条款的账号采取行动。
- 所以：**偶尔运行（一次就好，几个月后最多更新一次），保持 `-depth 1`，不要用代理绕过封锁，结果只供你个人使用。**
- **绝对不要出售、公开或分享原始名单**（不要上传 GitHub、不要发到群组、不要给“合作伙伴”）。`results.csv` 和 `leads.csv` 不要放进 Git 或共享文件夹。

### 2. 马来西亚 PDPA 也适用于“商家”资料

- 槟城很多店是**独资或合伙经营**。店里的电话常常就是老板的私人手机，像 `ahseng@gmail.com` 这样的电邮也能识别到个人。根据 **《2010年个人资料保护法》（PDPA，2024年修订）**，在商业用途中使用这些资料（例如向他们推销）时，它们属于**个人资料**。
- 实际上要做到：
  - **用途：** 只用来向这些店家介绍你的零售产品或服务。
  - **最少化：** 只保留 `leads.csv` 里的栏位。不要加入老板的身份证号码、住家地址、家庭资料，或从私人社交媒体找来的资料。
  - **安全：** 文件只放在自己的电脑或私人 Google 表格，不要到处转发。
  - **保存期限：** 拒绝了的店家就删除那一行；活动结束后（例如 6–12 个月）删除整个文件。
  - **拒绝直销的权利：** 任何人说“不要再联系我”，**当天**就把 `status` 改成 `do-not-contact`，以后不再联系。
  - 2024 年修订后罚款更高（最高 100 万令吉），并须通报资料外泄，所以请小心保管文件。

### 3. 可以这样用 ✅

| 用途 | 做法 |
|---|---|
| **市场规模估算** | 按 `segment`（类别）和 `area`（地区）统计店数，了解槟城每个市场有多大。完全不需要联系任何人。 |
| **广告定位** | 用地区和类别决定 Facebook/Google 广告投放在哪里（例如 Gurney 或 Seberang Jaya 附近的半径范围）。**不要把电话或电邮上传成“自定义受众”**：那些人从没同意过。 |
| **亲自上门拜访** | 按 `priority`（优先级）排序、按 `area` 分组，规划路线。直接走进店里自我介绍，留下传单或名片。要老板私人号码前先问。这对小店最有效。 |
| **熟人介绍** | 填写 `brother-knows` 栏。请你哥哥（或朋友、供应商、会计师）先帮你介绍，老板同意后才跟进。 |
| **发电邮到公开的商家电邮** | 只用店家在自己网站或资料上公开的电邮（`email` 栏）。每家店只发**一封**个人化、相关的电邮（不是群发），写上真实姓名、公司名和联系方式，并附上简单的退订句子，例如：*“如果您不想再收到我的邮件，回复‘stop’即可，我不会再发。”* 收到就立刻遵守。最多礼貌跟进一次。 |

### 4. 绝对不要 ❌

- **绝对不要用 WhatsApp 群发陌生信息给这些号码。** WhatsApp 的商业和商务政策只允许发信息给事先同意的人。群发未经请求的信息会让你的号码**被封**（常常几小时内），在马来西亚这也属于 PDPA 下对个人资料的未经请求直销。
- 不要群发 SMS，不要用自动拨号或机器人电话，不要把人拉进 WhatsApp/Telegram 群组。
- 不要去抓老板私人 Facebook/Instagram 的资料来“补充”名单。
- 没有人介绍就不要假装是别人介绍的。
- 对方说不要，就不要继续联系。

**只有在老板为了这个目的给你号码时，才可以发 WhatsApp**：例如上门时老板说“WhatsApp 资料给我”，或熟人介绍后老板同意被联系。
