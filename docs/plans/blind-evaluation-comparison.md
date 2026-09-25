# Đối chiếu: người, điều phối viên, và bốn evaluator mù

Một thí nghiệm chạy trong lần engagement thật đầu tiên của pica 3.0.2, để trả lời một câu hỏi
của client: **tự review thì có tìm ra vấn đề không?**

Ba nguồn phát hiện, trên cùng một bản dựng:

| Nguồn | Điều kiện |
|---|---|
| **N — người** | client, nhìn màn hình vài giây mỗi lần, không đọc tài liệu nào |
| **Đ — điều phối viên** | agent chính, có renderer, đo 17 khổ, render và nhìn nhiều vòng |
| **E — bốn evaluator mù** | mỗi người một lăng kính, có renderer, **không thấy** lý lẽ đã tạo ra bản dựng, không thấy lời client, không có quyền ghi |

---

## Người tìm ra — 6

| | Phát hiện | Đ có tìm ra không | Ghi chú |
|---|---|---|---|
| N1 | "trông nó quá xấu" | **không** | Đ đã render, bắt 5 lỗi cấu trúc, rồi vẫn chuyển tiếp — đối chiếu với luật thay vì phán xét chất lượng |
| N2 | "demo quá tệ, không responsive" | **không** | Đ đo đúng một khổ (1440) và tuyên bố đạt. Vỡ +160px ở 1280, +1050px ở 390 |
| N3 | guideline lẫn với màn hình | **không** | |
| N4 | demo là view PM, không phải nhân viên | **không** | 39 ghế so với 6 nằm ngay trong state Đ tự viết |
| N5 | "UI quá rối mắt, toàn chữ là chữ" | **không** | |
| N6 | không chuyển được giữa hai ứng dụng | **không** | Đ tìm ra sau khi client hỏi, không tự tìm |

**Người: 6/6 là phát hiện độc lập.** Không cái nào do điều phối viên tìm ra trước.

## Điều phối viên tìm ra — 8

Đều là lỗi **đo được**, tìm bằng render + đo, sau khi được người chỉ hướng:

svg 1312×1312px · tràn ngang 32px ở 1440 · cắt chữ ba chấm (tái phát 3 lần) · meta lặp lại chip ·
số trong rail tô màu (qua skill `dataviz`) · ghi chú build lọt vào board client · banner công bố
ăn 400px màn hình · `.chips` thừa 8px dưới 640px.

**Không cái nào thuộc loại người tìm ra.** Hai tập hợp gần như không giao nhau: người thấy *chất
lượng và sự phù hợp*, điều phối viên thấy *độ lệch số học*.

## Bốn evaluator mù tìm ra — 12

Chạy trên bản dựng **sau khi** N1–N3 đã sửa, nên ba cái đó không còn để tìm.

| | Phát hiện | Lăng kính | N | Đ |
|---|---|---|---|---|
| E1 | `wl-02` ở 1280: app 720px, **bỏ trống 44% màn hình** | quét | — | — |
| E2 | **28 trạng thái vẽ ở lo-fi, mất ở bản cuối**; 0/8 được dựng | lỗi & phục hồi | — | — |
| E3 | **24 control trông bấm được, 0 có hành vi** | walkthrough | — | — |
| E4 | Khung "Theo người" — tính năng PRD gọi là *Plane không có* — **không tồn tại** | walkthrough | — | — |
| E5 | UC-08 đối chiếu **không có cửa vào nào** | walkthrough | — | — |
| E6 | **Không chọn được từng việc** trước hành động bất khả nghịch | lỗi ∩ walkthrough | — | — |
| E7 | **Tên người làm tiêu đề cảnh báo đỏ** | niềm tin | — | — |
| E8 | Màn hình lãnh đạo **chưa từng được dựng ở fidelity cuối** | niềm tin | — | — |
| E9 | Một trạng thái, hai nhãn chữ khác nhau trên cùng màn hình | quét | — | — |
| E10 | Thời điểm đồng bộ nói hai lần, hai động từ | quét | — | — |
| E11 | Lời hứa "không dùng đánh giá" **không kiểm chứng được** — không có nhật ký truy cập | niềm tin | — | — |
| E12 | Dòng đã xác nhận (bất biến) có hover giống dòng còn thao tác được | lỗi | — | — |

**12/12 là phát hiện độc lập.** Không cái nào do người hoặc điều phối viên tìm ra trước.

---

## Ba điều thí nghiệm này chứng minh

**1 · Ba nguồn gần như không giao nhau.** 6 + 8 + 12 = 26 phát hiện, **giao nhau bằng không**.
Không phải ba mức độ kỹ lưỡng khác nhau trên cùng một danh sách — là ba loại lỗi khác nhau mà
mỗi vị trí quan sát chỉ thấy được một loại.

**2 · Fan-out hoạt động đúng như thiết kế.** E6 được hai lăng kính độc lập tìm ra — "lỗi & phục
hồi" và "cognitive walkthrough" — không ai thấy báo cáo của ai. Đó là sự chứng thực chéo mà
`evaluation.md` viện dẫn khi đòi 3–5 evaluator thay vì một.

**3 · Lăng kính quyết định phát hiện, không phải sự chăm chỉ.** E7 — tên người làm tiêu đề cảnh
báo — chỉ có lăng kính *niềm tin và động cơ* thấy được. Ba evaluator kia nhìn đúng màn hình đó và
không ai nêu, vì họ không được giao câu hỏi ấy. Một evaluator "về usability nói chung" sẽ không
tìm ra nó.

## Và một điều nó phơi ra về chính pica

**E7 do chỉ thị của điều phối viên tạo ra.** Yêu cầu "làm cho quét được" khiến ngoại lệ bị đẩy lên
đầu; khi ngoại lệ là *"người này không có gì để xác nhận"* thì không có công việc nào để chỉ vào,
nên giao diện chỉ vào **người**. `docs/tension-per-person.md` đã cảnh báo đúng hình dạng đó từ
bước 4.B, và nó vẫn xuất hiện — vì cảnh báo nằm trong văn xuôi, không nằm trong một check.

**Đánh giá chạy quá muộn.** Bước 5.6, sau khi mọi thứ đã dựng. Cả bốn evaluator đều có `Bash`,
nhưng **không luật nào bảo chúng phải bấm thử** — câu đó do điều phối viên viết vào brief, và nó
là thứ tìm ra E3, E4, E5. Nếu đánh giá chạy sớm hơn, với lệnh bấm trong luật thay vì trong brief,
phần lớn danh sách này sẽ được bắt trước khi client phải nhìn.
