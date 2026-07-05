-- 랜덤 닉네임: 성사 전 실명 대신 표시 (PROJECT_SPEC §7.6)
-- 단어 목록은 src/lib/nickname.ts와 동일하게 유지
ALTER TABLE "Profile" ADD COLUMN "nickname" TEXT;

UPDATE "Profile" SET "nickname" =
  (ARRAY['포근한','다정한','씩씩한','명랑한','슬기로운','온화한','유쾌한','진솔한',
         '순수한','활발한','차분한','사려깊은','낙천적인','겸손한','성실한','용감한',
         '재치있는','따뜻한','반짝이는','싱그러운','느긋한','상냥한','당찬','소탈한'])[floor(random()*24)::int + 1]
  || ' ' ||
  (ARRAY['수달','고슴도치','펭귄','사막여우','알파카','판다','돌고래','참새',
         '다람쥐','토끼','고래','물범','치타','부엉이','백조','사슴',
         '여우','곰돌이','강아지','고양이','햄스터','라마','미어캣','쿼카'])[floor(random()*24)::int + 1]
WHERE "nickname" IS NULL;

ALTER TABLE "Profile" ALTER COLUMN "nickname" SET NOT NULL;
