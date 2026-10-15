# RentAudit

<details open>
<summary><h2>🇬🇧 English</h2></summary>

An intelligent web system for real estate agents to manage rental housing, based on recognition and contextual validation of utility meter readings.

## The problem

Real estate agents who rent out several apartments have to collect meter readings from every tenant each month, check them, calculate utility charges and issue invoices. This is usually done by hand: tenants send photos to a messenger, the agent reads the numbers, types them into a spreadsheet and does the maths. The process is slow, mistakes are easy to make, and a leak or a faulty meter is often noticed only when an unusually large bill arrives.

## How it works

Each agent registers in the system and manages their own apartments, meters and tenants; agents never see each other's data. A tenant joins a specific apartment through an invitation link from the agent.

Once a month the tenant photographs the water, gas and electricity meters with a phone. The Gemini multimodal model reads the meter type, serial number and reading from the photo.

The recognized value is not accepted blindly. The system validates it against what it already knows about the meter: the number of digits, the meter type and serial number, the previous reading (the new one cannot be lower) and whether the increase is realistic. If a check fails, the reading is not accepted automatically and is sent to the agent for confirmation. Every correction is kept in the history together with the value originally recognized by the model and the reason for the change.

Confirmed readings are used to calculate utility charges by tariff. The system generates separate invoices for rent and for utilities; tariffs have an effective date, so a price change applies only to new invoices.

The system also looks for possible consumption anomalies. A month's consumption is compared with the apartment's usual level (the median of recent months) and, once a year of history is available, with the same month of the previous year. Anything unusual is flagged as a possible anomaly that needs checking, such as a leaking tap or a stopped meter.

## Key ideas

- **Contextual validation** of readings recognized from photos, so that recognition errors do not end up on invoices.
- **One place for the whole monthly cycle**: readings, charges, invoices and payment confirmation.
- **Isolated data** for every agent, with role-based access for agents, tenants and the administrator.

</details>

<details>
<summary><h2>🇺🇦 Українська</h2></summary>

Інтелектуальна вебсистема для ріелторів з управління орендою житла на основі розпізнавання та контекстної валідації показників лічильників.

## Проблема

Ріелтори, які здають кілька квартир, щомісяця мають зібрати показники лічильників від кожного орендаря, перевірити їх, порахувати нарахування та виставити рахунки. Зазвичай це робиться вручну: орендарі надсилають фото в месенджер, ріелтор переписує цифри в таблицю й рахує суми. Це довго, легко помилитися, а витік чи несправний лічильник часто помічають, лише коли приходить надто великий рахунок.

## Як це працює

Кожен ріелтор реєструється в системі й веде власні квартири, лічильники та орендарів; дані різних ріелторів ізольовані одне від одного. Орендар приєднується до конкретної квартири за посиланням-запрошенням від ріелтора.

Раз на місяць орендар фотографує з телефона лічильники води, газу та електроенергії. Мультимодальна модель Gemini зчитує з фото тип лічильника, серійний номер і показник.

Розпізнане значення не приймається наосліп. Система перевіряє його з урахуванням того, що вже знає про лічильник: кількість розрядів, тип і серійний номер, попередній показник (новий не може бути меншим) і реалістичність приросту. Якщо перевірка не пройдена, показник не приймається автоматично, а відправляється ріелтору на підтвердження. Кожне виправлення зберігається в історії разом зі значенням, яке розпізнала модель, і причиною зміни.

На основі підтверджених показників система рахує нарахування за тарифами. Система формує окремі рахунки за оренду та комунальні послуги; тарифи мають дату початку дії, тож зміна ціни стосується лише нових рахунків.

Також система шукає можливі аномалії споживання. Споживання за місяць порівнюється зі звичним рівнем квартири (медіаною за останні місяці), а за наявності річної історії — ще й із тим самим місяцем минулого року. Усе незвичне позначається як можлива аномалія, яку варто перевірити, наприклад кран, що підтікає, чи лічильник, який зупинився.

## Ключові ідеї

- **Контекстна валідація** показників, розпізнаних з фото, щоб помилки розпізнавання не потрапляли в рахунки.
- **Увесь щомісячний цикл в одному місці**: показники, нарахування, рахунки та підтвердження оплати.
- **Ізольовані дані** кожного ріелтора та доступ за ролями для ріелторів, орендарів і адміністратора.

</details>
