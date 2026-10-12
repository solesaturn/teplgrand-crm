"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { todayIso, uid } from "@/lib/format";
import { LEAD_GROUPS, SEGMENTS, STAGES, TASK_KIND } from "@/lib/labels";
import { DISCOUNTS } from "@/lib/policy";
import { BuyerLinks, PhoneList } from "@/components/lead-fields";
import type { DealStage, DiscountId, LeadGroup, LeadPhone, Segment, TaskKind } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function discountFor(segment: Segment | undefined): DiscountId {
  if (segment === "partner") return "d1";
  if (segment === "trader") return "d2";
  if (segment === "private") return "private-10";
  return "d3";
}

export function CompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <CompanyForm onClose={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function CompanyForm({ onClose }: { onClose: () => void }) {
  const { addCompany } = useCrm();
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [inn, setInn] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState<Segment>("installer");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Новая компания</DialogTitle>
        <DialogDescription>Карточка попадёт в рабочий список. Учебные клиенты из демо помечены отдельно.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !city.trim()) {
            setError("Укажите название и город.");
            return;
          }
          const id = addCompany({
            name: name.trim(),
            city: city.trim(),
            inn: inn.trim(),
            phone: phone.trim(),
            email: email.trim(),
            segment,
            note: note.trim(),
          });
          onClose();
          router.push(`/clients/${id}`);
        }}
      >
        <Field label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ООО «Пример»" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Город">
            <Input value={city} onChange={(event) => setCity(event.target.value)} />
          </Field>
          <Field label="ИНН">
            <Input value={inn} onChange={(event) => setInn(event.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Телефон">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Почта">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </Field>
        </div>
        <Field label="Тип покупателя">
          <ChoiceSelect
            label="Тип покупателя"
            value={segment}
            onChange={(value) => setSegment(value as Segment)}
            options={Object.entries(SEGMENTS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Заметка">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Объём закупок, какой уровень цены обсуждали" />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Сохранить компанию</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function ContactDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ContactForm companyId={companyId} onClose={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function ContactForm({ companyId, onClose }: { companyId?: string; onClose: () => void }) {
  const { data, addContact } = useCrm();
  const [company, setCompany] = useState(companyId ?? data.companies[0]?.id ?? "");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Новый контакт</DialogTitle>
        <DialogDescription>Человек, которому уйдёт КП и которому перезваниваем.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !company) {
            setError("Укажите имя и компанию.");
            return;
          }
          addContact({ companyId: company, name: name.trim(), role: role.trim(), phone: phone.trim(), email: email.trim() });
          onClose();
        }}
      >
        <Field label="Компания">
          <ChoiceSelect
            label="Компания"
            value={company}
            onChange={setCompany}
            options={data.companies.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label="Имя">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Должность">
          <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Снабженец, прораб, директор" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Телефон">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Почта">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </Field>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Сохранить контакт</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function DealDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <DealForm companyId={companyId} onClose={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function DealForm({ companyId, onClose }: { companyId?: string; onClose: () => void }) {
  const { data, addDeal } = useCrm();
  const router = useRouter();
  const initialCompany = companyId ?? data.companies[0]?.id ?? "";
  const [company, setCompany] = useState(initialCompany);
  const [contactId, setContactId] = useState(
    data.contacts.find((contact) => contact.companyId === initialCompany)?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DealStage>("new");
  const [nextStep, setNextStep] = useState("");
  const [error, setError] = useState("");
  const contacts = data.contacts.filter((contact) => contact.companyId === company);

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Новая сделка</DialogTitle>
        <DialogDescription>Сумма — ожидание, не итог КП. Точный расчёт появится в предложении.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
          if (!title.trim() || !company || !Number.isFinite(parsed) || parsed < 0) {
            setError("Укажите название, компанию и сумму.");
            return;
          }
          const id = addDeal({
            companyId: company,
            contactId: contactId || null,
            title: title.trim(),
            stage,
            amount: parsed,
            nextStep: nextStep.trim() || "Связаться и уточнить состав",
          });
          onClose();
          router.push(`/deals/${id}`);
        }}
      >
        <Field label="Компания">
          <ChoiceSelect
            label="Компания"
            value={company}
            onChange={(value) => {
              setCompany(value);
              setContactId(data.contacts.find((contact) => contact.companyId === value)?.id ?? "");
            }}
            options={data.companies.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label="Контакт">
          <ChoiceSelect
            label="Контакт"
            value={contactId}
            onChange={setContactId}
            options={contacts.length ? contacts.map((item) => ({ value: item.id, label: item.name })) : [{ value: "", label: "Контактов нет" }]}
          />
        </Field>
        <Field label="О чём сделка">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Котельная на объекте" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сумма, ₽">
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Этап">
            <ChoiceSelect
              label="Этап"
              value={stage}
              onChange={(value) => setStage(value as DealStage)}
              options={STAGES.map((item) => ({ value: item.id, label: item.title }))}
            />
          </Field>
        </div>
        <Field label="Следующий шаг">
          <Input value={nextStep} onChange={(event) => setNextStep(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Создать сделку</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  companyId,
  dealId,
  contactId,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  dealId?: string;
  contactId?: string;
  leadId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TaskForm companyId={companyId} dealId={dealId} contactId={contactId} leadId={leadId} onClose={() => onOpenChange(false)} />
      ) : null}
    </Dialog>
  );
}

function TaskForm({
  companyId,
  dealId,
  contactId,
  leadId,
  onClose,
}: {
  companyId?: string;
  dealId?: string;
  contactId?: string;
  leadId?: string;
  onClose: () => void;
}) {
  const { data, addTask } = useCrm();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("call");
  const [due, setDue] = useState(todayIso());
  const [company, setCompany] = useState(companyId ?? "");
  const [deal, setDeal] = useState(dealId ?? "");
  const [error, setError] = useState("");
  const deals = data.deals.filter((item) => !company || item.companyId === company);

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Напоминание</DialogTitle>
        <DialogDescription>Звонок, письмо или выезд. Просроченное останется в списке, пока не отметите.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !due) {
            setError("Укажите, что сделать, и дату.");
            return;
          }
          addTask({
            title: title.trim(),
            kind,
            due,
            companyId: company || null,
            dealId: deal || null,
            contactId: contactId ?? null,
            leadId: leadId ?? null,
          });
          onClose();
        }}
      >
        <Field label="Что сделать">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Перезвонить и спросить про счёт" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Тип">
            <ChoiceSelect
              label="Тип задачи"
              value={kind}
              onChange={(value) => setKind(value as TaskKind)}
              options={Object.entries(TASK_KIND).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Срок">
            <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </Field>
        </div>
        <Field label="Компания">
          <ChoiceSelect
            label="Компания"
            value={company}
            onChange={(value) => {
              setCompany(value);
              setDeal("");
            }}
            options={[{ value: "", label: "Без компании" }, ...data.companies.map((item) => ({ value: item.id, label: item.name }))]}
          />
        </Field>
        <Field label="Сделка">
          <ChoiceSelect
            label="Сделка"
            value={deal}
            onChange={setDeal}
            options={[{ value: "", label: "Без сделки" }, ...deals.map((item) => ({ value: item.id, label: item.title }))]}
          />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Поставить задачу</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function OfferDialog({
  open,
  onOpenChange,
  companyId,
  dealId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  dealId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <OfferForm companyId={companyId} dealId={dealId} onClose={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function OfferForm({ companyId, dealId, onClose }: { companyId?: string; dealId?: string; onClose: () => void }) {
  const { data, createOffer } = useCrm();
  const router = useRouter();
  const initialCompany = companyId ?? data.companies[0]?.id ?? "";
  const initialSegment = data.companies.find((item) => item.id === initialCompany)?.segment;
  const [company, setCompany] = useState(initialCompany);
  const [contactId, setContactId] = useState(
    data.contacts.find((contact) => contact.companyId === initialCompany)?.id ?? "",
  );
  const [deal, setDeal] = useState(dealId ?? "");
  const [discountId, setDiscountId] = useState<DiscountId>(discountFor(initialSegment));
  const [error, setError] = useState("");
  const contacts = data.contacts.filter((contact) => contact.companyId === company);
  const deals = data.deals.filter((item) => item.companyId === company);

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Новое коммерческое предложение</DialogTitle>
        <DialogDescription>Скидка берётся из ценовой политики от 20.01.2026. Строки добавите из каталога.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!company) {
            setError("Выберите покупателя.");
            return;
          }
          const id = createOffer({
            companyId: company,
            contactId: contactId || null,
            dealId: deal || null,
            discountId,
          });
          onClose();
          router.push(`/offers/${id}`);
        }}
      >
        <Field label="Покупатель">
          <ChoiceSelect
            label="Покупатель"
            value={company}
            onChange={(value) => {
              setCompany(value);
              setContactId(data.contacts.find((contact) => contact.companyId === value)?.id ?? "");
              setDeal("");
              setDiscountId(discountFor(data.companies.find((item) => item.id === value)?.segment));
            }}
            options={data.companies.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label="Контакт">
          <ChoiceSelect
            label="Контакт"
            value={contactId}
            onChange={setContactId}
            options={contacts.length ? contacts.map((item) => ({ value: item.id, label: item.name })) : [{ value: "", label: "Контакта нет" }]}
          />
        </Field>
        <Field label="Сделка">
          <ChoiceSelect
            label="Сделка"
            value={deal}
            onChange={setDeal}
            options={[{ value: "", label: "Без сделки" }, ...deals.map((item) => ({ value: item.id, label: item.title }))]}
          />
        </Field>
        <Field label="Скидка">
          <ChoiceSelect
            label="Скидка"
            value={discountId}
            onChange={(value) => setDiscountId(value as DiscountId)}
            options={DISCOUNTS.map((item) => ({ value: item.id, label: item.shortLabel }))}
          />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Открыть КП</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function LeadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <LeadForm
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      ) : null}
    </Dialog>
  );
}

function LeadForm({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const { addLead, sellerId, data } = useCrm();
  const seller = data.sellers.find((item) => item.id === sellerId);
  const [name, setName] = useState("");
  const [phones, setPhones] = useState<LeadPhone[]>(() => [{ id: uid("ph"), number: "", owner: "" }]);
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState<Segment>("installer");
  const [interest, setInterest] = useState("");
  const [group, setGroup] = useState<LeadGroup>("new");
  const [linksOpen, setLinksOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  return (
    <DialogContent className="sm:max-w-lg!">
      <DialogHeader>
        <DialogTitle>Новый лид</DialogTitle>
        <DialogDescription>
          Попадёт в список {seller ? seller.name : "текущей учётки"}. Заметка останется только у вас.
        </DialogDescription>
      </DialogHeader>
      <form
        className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1"
        onSubmit={(event) => {
          event.preventDefault();
          const filledPhones = phones
            .map((phone) => ({ ...phone, number: phone.number.trim(), owner: phone.owner.trim() }))
            .filter((phone) => phone.number);
          if (!name.trim() || filledPhones.length === 0) {
            setError("Укажите имя и телефон.");
            return;
          }
          const id = addLead({
            name: name.trim(),
            phones: filledPhones,
            companyName: companyName.trim(),
            city: city.trim(),
            email: email.trim(),
            segment,
            interest: interest.trim(),
            group,
            website: website.trim(),
            mapUrl: mapUrl.trim(),
            note: note.trim(),
          });
          onCreated?.(id);
          onClose();
        }}
      >
        <Field label="Имя">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Иван Петров" />
        </Field>
        <PhoneList phones={phones} onChange={setPhones} />
        <BuyerLinks
          open={linksOpen}
          onOpen={() => setLinksOpen(true)}
          website={website}
          mapUrl={mapUrl}
          onWebsite={setWebsite}
          onMap={setMapUrl}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Компания или объект">
            <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="ООО «Пример»" />
          </Field>
          <Field label="Город">
            <Input value={city} onChange={(event) => setCity(event.target.value)} />
          </Field>
        </div>
        <Field label="Почта">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </Field>
        <Field label="Тип покупателя">
          <ChoiceSelect
            label="Тип покупателя"
            value={segment}
            onChange={(value) => setSegment(value as Segment)}
            options={Object.entries(SEGMENTS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Что нужно">
          <Textarea value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="Котёл, краны, объём и срок" />
        </Field>
        <Field label="Группа">
          <ChoiceSelect
            label="Группа"
            value={group}
            onChange={(value) => setGroup(value as LeadGroup)}
            options={LEAD_GROUPS.map((item) => ({ value: item.id, label: item.title }))}
          />
        </Field>
        <Field label="Заметка для себя">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательно. Другие продавцы её не увидят." />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="submit">Сохранить лид</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
