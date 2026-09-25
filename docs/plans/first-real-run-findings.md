# Những gì lần chạy end-to-end đầu tiên tìm ra

pica 3.0.0 được phát hành, đóng gói, cài đặt và CI xanh trước khi có ai chạy `/picaflow` một lần
với brief thật. Lần chạy đầu tiên đó — một ứng dụng nhật ký công việc nội bộ đọc từ một instance
Plane self-host — tìm ra **mười hai khiếm khuyết**, trong đó ba cái làm chuỗi không chạy được và
năm cái là lỗ hổng cấu trúc mà không check nào giữ.

Tài liệu này ghi cả mười hai, chia theo *đã sửa* và *còn mở*, vì cái còn mở mới là phần đáng giá.

---

## Đã sửa và đã phát hành

| # | Khiếm khuyết | Sửa ở |
|---|---|---|
| **E1** | Markdown của slash command bị thay tham số trước khi shell thấy, nên `$1`/`$2` trong khối bash bị thay bằng chữ của người dùng. Bốn command file định nghĩa resolver trên positional parameter → mọi lời gọi in `SKIPPED` | 3.0.2 — `core/scripts/pica-run.mjs` |
| **E2** | `picaflow` chạy `capture-html-reference.mjs` từ `pica-html`, package 3.0.0 đã xoá. Tám check đo lường phụ thuộc capture đó | 3.0.2 |
| **E3** | `pica-wp` chạy `proposal-check.mjs` từ `core`, nơi chưa bao giờ ship nó | 3.0.2 |
| **E4** | Không gì đọc command file như code | 3.0.2 — `scripts/command-script-check.mjs` |
| **E5** | `data-governed` đọc `e?.name`; trường chuẩn là `entity` theo chính worked example. Đỏ vô điều kiện với mọi domain model đúng hình dạng | `main` — 51649e2 |

---

## Còn mở

### E6 · pica-verify báo ABSTAIN cho check đã PASS

`core/scripts/pica-verify.mjs:177` nhận diện abstain bằng **grep văn xuôi**:

```js
const ABSTAINED_RE = /\bthis is an abstention,? not a pass\b|\bNOT a pass\b|\bdid NOT run\b|\bcould not be (read|parsed)\b/i;
```

`palette-check` exit 0 với `0 finding(s). The palette can be offered.` — nhưng dòng NOTE **mang
tính thông tin** của nó chứa `could not be read` (đúng hành vi: sector `professional` có danh sách
hue dành riêng rỗng theo thiết kế). Nên nó bị đếm là abstain, vĩnh viễn.

Đây là lỗi kiến trúc: **trạng thái abstain truyền qua ranh giới tiến trình bằng một chuỗi trần.**
Bất kỳ check nào lỡ dùng cụm đó trong phần thông tin đều bị báo nhầm; ngược lại một check muốn
abstain chỉ cần đổi cách diễn đạt là biến mất khỏi cột abstain.

**Hướng sửa:** giao thức máy đọc được — exit code riêng cho abstain, hoặc một dòng
`PICA-ABSTAIN: <lý do>`. Giữ regex làm fallback cho check cũ.

### E7 · pica-ui-designer được giao việc thiết kế nhưng không có renderer

| Vai | Có renderer | Được giao |
|---|---|---|
| `pica-ux-engineer` | `capture-html-reference.mjs` | dựng màn hình |
| `pica-ui-designer` | **không có gì** | hướng thiết kế, style tile, nền tảng |

Quy tắc số 1 của pica bắt buộc *"render every screen and look at it"*. Vai quyết định **mọi thứ
trông thế nào** là vai duy nhất không được cấp công cụ để tuân thủ.

Bằng chứng từ lần chạy này: agent tự kiểm bằng toán học — tính mọi cặp tương phản, grep mọi cỡ
chữ, đếm mọi viền — và **bắt được hai lỗi thật** (một chip tụt 2.80:1 khi chồng nền hover). Rồi
một `<svg>` render ở **1312×1312px** và **32px tràn ngang** đi qua sạch, vì cả hai là hình học bố
cục, không phải màu/cỡ chữ/viền.

**Hướng sửa:** chuyển `capture-html-reference.mjs` lên `pica-core` để mọi vai dựng HTML gọi được.

### E8 · industries.json `professional` không dùng được cho công cụ nội bộ

Bảng stakeholder của sector này được xây cho **website giới thiệu năng lực của agency**
(prospective client, hiring manager, former client under NDA). Nó không phục vụ được công cụ nội
bộ của chính công ty đó, dù cả hai đều là `professional`.

**Bốn agent độc lập, không ai thấy kết luận của ai, cùng kết luận này** — ba `pica-ux-researcher`
và một `pica-business-analyst`. Agent cuối còn ghi nhận hình thức vào state
(`industry.stakeholdersNotApplicable`). Đây không còn là ý kiến, là phép đo.

**Hướng sửa:** stakeholder phụ thuộc **archetype** (ai dùng một `erp` nội bộ) nhiều hơn phụ thuộc
**sector** (ngành gì). Bảng stakeholder có lẽ thuộc về `archetypes.json`, hoặc phải là tích của cả
hai.

### E9 · Không cổng nào đo tay nghề

63 assertion xanh — tương phản, sàn cỡ chữ, vùng bấm, truy vết, độ phủ trạng thái — trên một màn
hình mà client nhìn ba giây và nói *"trông nó quá xấu"*.

Các agent **chạm sàn ở mọi chỗ và không bao giờ nhắm cao hơn sàn**. Nghiên cứu đo đúng Inter
Variable với trọng lượng 510/590/680, `tabular-nums`, khoảng trắng thay viền, thang elevation 5
bậc — và bản dựng lấy mã màu rồi bỏ lại tất cả phần còn lại.

Đây có thể **không sửa được bằng một check**, và nếu vậy thì pica nên nói thẳng điều đó ở chỗ dễ
thấy hơn: cơ chế bảo vệ duy nhất là một người nhìn rồi nói thật.

### E10 · Style tile và direction board không bao giờ được đo viewport

`verify-html` có check overflow và viewport coverage. Nó chạy ở bước 5.5, trên thư mục `html/`.
Direction board — **thứ client nhìn thấy đầu tiên và dùng để quyết hướng** — nằm ở
`html/directions/` và không đi qua phép đo nào.

Hệ quả thật trong lần chạy này: board bị đóng cứng `width:1440px`. Ở 1280px (khổ laptop phổ biến
nhất) tràn +160px; ở 390px tràn +1050px. Client mở trên máy mình và nó hỏng trước khi họ đọc một
chữ nào.

### E11 · Không có bất biến "tiêu đề không bao giờ bị cắt"

Cùng một lỗi cắt chữ ba chấm xuất hiện **ba lần** trong một phiên: ở wireframe xám, sửa; ở bản
tinh chỉnh, sửa dưới 640px; rồi vẫn sống trong dải 641–1180px.

Mỗi lần được sửa như một lỗi tại một breakpoint, chứ không phải như một **bất biến ở mọi khổ**.
pica có `verify-html` đo overflow nhưng không đo *"không phần tử nào mang nội dung định danh bị
cắt bằng ellipsis ở bất kỳ viewport nào"*.

### E12 · 15 trên 39 check chưa bao giờ được chứng minh theo chiều nào — ĐÃ SỬA

Đây là nguyên nhân gốc của **E5**, và là phát hiện đáng giá nhất trong danh sách.

`mutate.mjs` in ra `100 caught · 0 missed · 0 skipped`, và người đọc hiểu là đủ. Đo lại:

```
check khai báo trong manifest:  39
có mutation trong mutate.mjs:   24
proven in neither direction:    15
```

Từ làm việc nặng nhất nằm ngay trong dòng kết của chính mutate.mjs: *"clean on every script
**exercised**"*. Đúng — và đúng với một tập con không ai đếm.

`architecture-check` là một trong 15. `data-governed` của nó đỏ vô điều kiện với mọi domain model
đúng hình dạng, suốt ba bản phát hành, bên dưới một suite xanh. Fixture không có key
`architecture`, nên check **abstain** thay vì chạy — trung thực, và rơi vào một khoảng im lặng
không ai đếm.

Một check không có mutation không phải là check sai. Nó là check **không ai nói được gì về nó** —
và bảng xanh không phân biệt hai thứ đó.

**Đã sửa:** `scripts/mutation-coverage-check.mjs`, có ratchet như `rule-coverage-check` và vì cùng
lý do — một suite đỏ ngay ngày nó ra đời dạy mọi người bỏ qua màu đỏ. Baseline hôm nay là 15;
chỉ con số **tệ đi** mới đỏ. Thêm một check mà không thêm mutation cho nó là thứ nó chặn.

Đã thấy nó đỏ đúng trên defect nó được viết ra để bắt, và xanh lại khi khôi phục.


---

## E13 · Tái cấu trúc 3.0.0 chia một vai tốt thành hai vai thiếu — ĐÃ SỬA MỘT NỬA

Client nói: *"pica bản cũ từ hồi kiểu mới ra design đẹp oke lắm, chẳng hiểu sao giờ kh như vậy
nữa."* Đây là một sự thoái lui, và nó kiểm chứng được từ backup 2.1.0.

**2.1.0 có đúng một agent thiết kế**, `pica-designer`, trong package `html`. Chỉ thị mở đầu của
nó:

> **Load:** `html-prototype.md`, `html-gates.md`, `design-vocabulary.md`, và `native-mobile.md`
> nếu có native. Rồi sector entry **đầy đủ**.

Dòng mô tả vai kết thúc bằng:

> *"...then every screen at every viewport in every state, and **measures before showing anyone**."*

**3.0.0 tách nó làm đôi.** Bốn luật dựng và renderer sang `ux-engineer`. Vai mới `ui-designer`
nhận **một** file luật (`direction.md`), **không renderer**, và một dòng mô tả kết thúc bằng:

> *"...**Builds no screens.**"*

| | 2.1.0 `pica-designer` | 3.0.2 `ui-designer` |
|---|---|---|
| Từ vựng đo được | đọc | đọc |
| Luật dựng | **nắm cả 4** | **không cái nào** |
| Renderer | có | **không** |
| Dựng màn hình và đo | **có, bắt buộc** | **bị cấm** |
| Quyết mọi thứ trông thế nào | có | có |

Vai quyết định hình thức bị tước đúng ba thứ giúp nó quyết đúng: luật tay nghề, khả năng nhìn, và
việc phải tự dựng ra thứ mình quyết. Không ai xoá gì — việc tách vai **tạo ra một nửa bị mù**.

**Đã sửa nửa rẻ:** `roles/ui-designer/rules/craft.md` mới, và agent `pica-ui-designer` được trả
lại khối `Load` — craft, direction, design-vocabulary, và `ux-engineer`'s html-gates +
html-prototype — cộng lệnh nạp skill `dataviz` của Claude khi bề mặt có tổng hợp, cộng lệnh phải
render-và-nhìn hoặc **ghi rõ là đã không nhìn được**.

**Nửa còn lại chưa sửa:** `ui-designer` vẫn không có renderer (E7). Đó là quyết định kiến trúc:
chuyển `capture-html-reference.mjs` lên `pica-core` để mọi vai dựng HTML gọi được.

## E14 · Chín agent trỏ vào một file luật không tồn tại — ĐÃ SỬA

Chín agent — gần như mọi vai — dặn người đọc:

> Load `roles/estimate/rules/estimation.md` for the method.

File đó **không tồn tại ở đâu trong repo**. Vai `estimate` bị gỡ trước 3.0.0 và chín tham chiếu
tới nó sống sót qua rename, vì một đường dẫn nằm trong văn xuôi là chuỗi trần, và rename chỉ chạm
đường dẫn nằm trong code.

**Mọi vai của pica đã ước lượng dựa trên một file rỗng kể từ 3.0.0, và không gì nói ra điều đó.**

Đây là **lần thứ sáu** của cùng một lớp lỗi, và năm lần trước mỗi lần đều được viết một check
riêng sau khi sự đã rồi. `validate-packages` giữ file **được khai báo**; `command-script-check`
giữ script **được gọi**; không gì giữ dạng thứ ba: **file mà một con người được bảo hãy đọc**.

**Đã sửa:** `scripts/reference-check.mjs` đọc mọi markdown trong `roles/` và `core/`, rút mọi
đường dẫn trỏ vào package, và fail khi đích không tồn tại. 110 tham chiếu trong 75 file, 0 finding
sau khi sửa. Đã thấy nó đỏ đúng trên defect nó sinh ra để bắt.

## E15 · pica không bao giờ dùng skill thiết kế của Claude

Đếm được: `artifact-design`, `dataviz`, `artifact-diagramming`, `frontend-design` — **0 file
trong toàn bộ pica nhắc tới bất kỳ cái nào**.

pica có nghiên cứu thiết kế riêng và nghiên cứu đó tốt — `design-researcher` đo bốn sản phẩm đã
ship trên chín nền tảng với provenance thật. Nhưng giữa *đo được* và *dựng đẹp* có một khoảng
trống, và Claude ship sẵn hướng dẫn cho đúng khoảng trống đó.

Cụ thể trong lần chạy này: rail tổng quan tô màu chính các **con số**. Luật của `dataviz`: *chữ
mặc token chữ, không bao giờ mặc màu của chuỗi dữ liệu* — con số là mực, một dấu hiệu có **hình
dạng** bên cạnh mới mang danh tính. Không luật nào của pica nói điều đó, và không check nào bắt.

**Đã sửa một phần:** `craft.md` và agent `ui-designer` giờ chỉ thị nạp `dataviz` khi bề mặt có
tổng hợp, và cố ý **không chép lại** nội dung của nó để không bị lệch pha.

**Chưa làm:** `artifact-design` cho vai dựng, và câu hỏi rộng hơn — pica nên **mượn** hướng dẫn
thiết kế của Claude ở đâu thay vì tự viết lại. Đó là quyết định của chủ framework.
